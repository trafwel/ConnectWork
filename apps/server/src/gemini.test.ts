// ACCEPTANCE TESTS for M5 (gemini.ts).
// These are skipped until you build that milestone. They describe exactly what
// "done" means: when you finish it, change every `describe(` below back to
// `describe(` and run `pnpm test` — they should all pass.
import { ApiError } from '@google/genai';
import { describe, expect, it, vi } from 'vitest';
import { AiError, isRetryable, withFallback } from './gemini';

const apiError = (status: number) => new ApiError({ message: `HTTP ${status}`, status });

describe('isRetryable', () => {
  it('retries overload, deadline, rate limit and timeouts', () => {
    for (const status of [429, 500, 503, 504]) expect(isRetryable(apiError(status))).toBe(true);
    expect(isRetryable(new Error('Request timed out'))).toBe(true);
  });

  it('does not retry client errors', () => {
    expect(isRetryable(apiError(400))).toBe(false);
    expect(isRetryable(apiError(403))).toBe(false);
  });
});

describe('withFallback', () => {
  const quiet = () => {};

  it('returns the primary result without touching the fallback', async () => {
    const fallback = vi.fn(async () => 'fallback');
    expect(await withFallback(async () => 'primary', fallback, quiet)).toBe('primary');
    expect(fallback).not.toHaveBeenCalled();
  });

  it('uses the fallback when the primary model is overloaded', async () => {
    const log = vi.fn();
    const result = await withFallback(
      async () => {
        throw apiError(503);
      },
      async () => 'fallback',
      log,
    );
    expect(result).toBe('fallback');
    expect(log).toHaveBeenCalledWith(expect.stringContaining('HTTP 503'));
  });

  it('does not fall back on a bad request', async () => {
    const fallback = vi.fn(async () => 'fallback');
    await expect(
      withFallback(
        async () => {
          throw apiError(400);
        },
        fallback,
        quiet,
      ),
    ).rejects.toMatchObject({ code: 'ai_unavailable' });
    expect(fallback).not.toHaveBeenCalled();
  });

  it('reports rate limiting when both models are rate limited', async () => {
    const err = await withFallback(
      async () => {
        throw apiError(429);
      },
      async () => {
        throw apiError(429);
      },
      quiet,
    ).catch((e) => e);
    expect(err).toBeInstanceOf(AiError);
    expect(err.code).toBe('rate_limited');
  });

  it('maps a primary failure with no fallback', async () => {
    await expect(
      withFallback(async () => {
        throw apiError(504);
      }),
    ).rejects.toMatchObject({ code: 'ai_unavailable' });
  });
});

// M5 review additions: a chain of fallbacks with an overall time budget.
describe('withFallback chain', () => {
  const quiet = () => {};
  it('tries each fallback in order after retryable errors', async () => {
    const calls: string[] = [];
    const fail = (name: string, status: number) => async () => {
      calls.push(name);
      throw apiError(status);
    };
    const result = await withFallback(fail('primary', 503), [fail('fb1', 504), async () => (calls.push('fb2'), 'ok')], quiet);
    expect(result).toBe('ok');
    expect(calls).toEqual(['primary', 'fb1', 'fb2']);
  });

  it('stops the chain once the time budget is used up', async () => {
    const fb = vi.fn(async () => 'late');
    const slowFail = async () => {
      await new Promise((r) => setTimeout(r, 30));
      throw apiError(503);
    };
    await expect(withFallback(slowFail, [fb], quiet, 10)).rejects.toMatchObject({ code: 'ai_unavailable' });
    expect(fb).not.toHaveBeenCalled();
  });
});

// M9 live findings.
describe('M9 fixes', async () => {
  const { toGeminiSchema } = await import('./gemini');
  const { ExtractResponse, WeeklyReviewResponse } = await import('@connectwork/shared');

  it('reports rate limiting when any model was rate limited, even if the last failed differently', async () => {
    const err = await withFallback(
      async () => {
        throw apiError(429);
      },
      [
        async () => {
          throw apiError(429);
        },
        async () => {
          throw apiError(400);
        },
      ],
      () => {},
    ).catch((e) => e);
    expect(err).toBeInstanceOf(AiError);
    expect(err.code).toBe('rate_limited');
  });

  it('sends Gemini no list caps above 100 (flash-lite rejects maxItems 200), but keeps small ones', () => {
    const extract = JSON.stringify(toGeminiSchema(ExtractResponse));
    expect(extract).not.toContain('"maxItems":200');
    expect(JSON.stringify(toGeminiSchema(WeeklyReviewResponse))).toContain('"maxItems":6');
    // zod still enforces the real cap on the reply:
    expect(ExtractResponse.safeParse({ people: Array.from({ length: 201 }, () => ({ name: 'x' })) }).success).toBe(false);
  });
});
