// ACCEPTANCE TESTS for M5 (routes/ai.ts, cache.ts, gemini.ts).
// These are skipped until you build that milestone. They describe exactly what
// "done" means: when you finish it, change every `describe(` below back to
// `describe(` and run `pnpm test` — they should all pass.
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { createApp } from '../app';
import { canonicalJson, DemoCache } from '../cache';
import { AiError, type Generate } from '../gemini';
import { summaryIds } from './ai';

const summary = [
  'P|p_abbey|Abbey Chen|2|Work|Work|Microsoft|Product Manager|University of Washington|2026-09-07|2025-06-14',
  'P|p_john|John Park|2|School|School,follow-up|University of Washington|CS student||2026-03-21|2024-09-17',
  'L|p_abbey|p_01|same team',
  'R|p_john|2026-10-18|Follow up after the career fair',
].join('\n');

const post = (app: ReturnType<typeof createApp>, body: unknown) =>
  app.request('/api/ai/query', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });

const appWith = (generate: Generate | null, cache = new DemoCache('off')) => createApp({ generate, cache });

describe('summaryIds', () => {
  it('reads person ids from P lines only', () => {
    expect([...summaryIds(summary)]).toEqual(['p_abbey', 'p_john']);
  });
});

describe('POST /api/ai/query', () => {
  it('returns the answer and drops ids the model invented', async () => {
    const generate = vi.fn<Generate>(async () =>
      JSON.stringify({ answer: 'You know Abbey Chen at Microsoft.', personIds: ['p_abbey', 'p_ghost', 'p_abbey'], filterHint: 'none' }),
    );
    const res = await post(appWith(generate), { question: 'Who do I know at Microsoft?', summary });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ answer: 'You know Abbey Chen at Microsoft.', personIds: ['p_abbey'], filterHint: 'none' });

    const call = generate.mock.calls[0]![0];
    expect(call.system).toContain('network assistant');
    expect(call.thinking).toBe('low');
    expect(JSON.stringify(call.parts)).toContain('Who do I know at Microsoft?');
    expect(call.jsonSchema).toMatchObject({ type: 'object' });
    expect(call.jsonSchema).not.toHaveProperty('$schema');
  });

  it('retries once when the reply does not match the schema', async () => {
    const generate = vi
      .fn<Generate>()
      .mockResolvedValueOnce('not json')
      .mockResolvedValueOnce(JSON.stringify({ answer: 'Nobody matches.', personIds: [] }));
    const res = await post(appWith(generate), { question: 'Who works at Nowhere?', summary });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ answer: 'Nobody matches.', personIds: [], filterHint: 'none' });
    expect(generate).toHaveBeenCalledTimes(2);
    expect(JSON.stringify(generate.mock.calls[1]![0].parts)).toContain('did not match the schema');
  });

  it('gives up after two bad replies', async () => {
    const generate = vi.fn<Generate>(async () => JSON.stringify({ wrong: true }));
    const res = await post(appWith(generate), { question: 'Who?', summary });
    expect(res.status).toBe(502);
    expect(await res.json()).toMatchObject({ error: 'bad_ai_response' });
  });

  it('explains when no API key is configured', async () => {
    const res = await post(appWith(null), { question: 'Who?', summary });
    expect(res.status).toBe(503);
    expect(await res.json()).toMatchObject({ error: 'no_api_key' });
  });

  it('maps Gemini rate limits to a friendly 503', async () => {
    const res = await post(
      appWith(async () => {
        throw new AiError('rate_limited', '429');
      }),
      { question: 'Who?', summary },
    );
    expect(res.status).toBe(503);
    expect(await res.json()).toMatchObject({ error: 'rate_limited', message: expect.stringContaining('busy') });
  });

  it('rejects malformed requests', async () => {
    const res = await post(appWith(null), { question: '' });
    expect(res.status).toBe(400);
  });

  it('records replies and replays them without calling Gemini', async () => {
    const file = join(mkdtempSync(join(tmpdir(), 'cw-cache-')), 'demo-cache.json');
    const generate = vi.fn<Generate>(async () => JSON.stringify({ answer: 'Abbey.', personIds: ['p_abbey'] }));
    const body = { question: 'Who do I know at Microsoft?', summary };

    await post(appWith(generate, new DemoCache('record', file)), body);
    expect(Object.keys(JSON.parse(readFileSync(file, 'utf8')))).toHaveLength(1);

    const offline = vi.fn<Generate>();
    const res = await post(appWith(offline, new DemoCache('replay', file)), body);
    expect(res.headers.get('x-cache')).toBe('hit');
    expect(await res.json()).toEqual({ answer: 'Abbey.', personIds: ['p_abbey'], filterHint: 'none' });
    expect(offline).not.toHaveBeenCalled();
  });
});

describe('canonicalJson', () => {
  it('ignores key order', () => {
    expect(canonicalJson({ b: 1, a: [1, { d: 2, c: 3 }] })).toBe(canonicalJson({ a: [1, { c: 3, d: 2 }], b: 1 }));
  });
});

// M5 review additions.
describe('requestToday', async () => {
  const { requestToday } = await import('./ai');
  const now = new Date(2026, 9, 17, 23, 30); // 11:30 PM local
  it("uses the browser's local date when it is plausible", () => {
    expect(requestToday('2026-10-17', now)).toBe('2026-10-17');
    expect(requestToday('2026-10-18', now)).toBe('2026-10-18'); // a user a time zone ahead
  });
  it('falls back to the server local date for missing, malformed or far-off dates', () => {
    expect(requestToday(undefined, now)).toBe('2026-10-17');
    expect(requestToday('2026-02-30', now)).toBe('2026-10-17');
    expect(requestToday('2020-01-01', now)).toBe('2026-10-17');
    expect(requestToday('tomorrow', now)).toBe('2026-10-17');
  });
  it('puts that date in the prompt but not in the cache key', async () => {
    const generate = vi.fn<Generate>(async () => JSON.stringify({ answer: 'x', personIds: [] }));
    const app = appWith(generate);
    await app.request('/api/ai/query', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-client-date': '2026-10-18' },
      body: JSON.stringify({ question: 'Who?', summary }),
    });
    expect(JSON.stringify(generate.mock.calls[0]![0].parts)).toContain('Today is ');
  });
});

describe('rate limit', () => {
  const generate: Generate = async () => JSON.stringify({ answer: 'x', personIds: [] });
  it('allows 30 requests a minute, then answers 429 with retry-after; health is never limited', async () => {
    const app = appWith(generate);
    const statuses: number[] = [];
    for (let i = 0; i < 31; i++) statuses.push((await post(app, { question: 'Who?', summary })).status);
    expect(statuses.slice(0, 30).every((s) => s === 200)).toBe(true);
    const last = await post(app, { question: 'Who?', summary });
    expect(last.status).toBe(429);
    expect(Number(last.headers.get('retry-after'))).toBeGreaterThan(0);
    expect((await app.request('/api/health')).status).toBe(200);
  });

  it('ignores a faked X-Forwarded-For unless the proxy is trusted', async () => {
    const app = appWith(generate);
    const statuses: number[] = [];
    for (let i = 0; i < 31; i++) {
      const res = await app.request('/api/ai/query', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-forwarded-for': `10.0.0.${i}` },
        body: JSON.stringify({ question: 'Who?', summary }),
      });
      statuses.push(res.status);
    }
    expect(statuses.at(-1)).toBe(429); // a new fake IP per request did not reset the limit
  });
});
