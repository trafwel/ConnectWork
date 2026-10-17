// ACCEPTANCE TESTS for M5 (gemini.ts).
// These are skipped until you build that milestone. They describe exactly what
// "done" means: when you finish it, change every `describe.skip(` below back to
// `describe(` and run `pnpm test` — they should all pass.
import { ApiError } from '@google/genai';
import { describe, expect, it, vi } from 'vitest';
import { AiError, isRetryable, withFallback } from './gemini';

const apiError = (status: number) => new ApiError({ message: `HTTP ${status}`, status });

describe.skip('isRetryable', () => {
  it('retries overload, deadline, rate limit and timeouts', () => {
    for (const status of [429, 500, 503, 504]) expect(isRetryable(apiError(status))).toBe(true);
    expect(isRetryable(new Error('Request timed out'))).toBe(true);
  });

  it('does not retry client errors', () => {
    expect(isRetryable(apiError(400))).toBe(false);
    expect(isRetryable(apiError(403))).toBe(false);
  });
});

describe.skip('withFallback', () => {
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
