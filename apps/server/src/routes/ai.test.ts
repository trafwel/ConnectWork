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

// M6
describe('POST /api/ai/classify', () => {
  const people = [
    { id: 'p_1', name: 'Ravi Fischer', company: 'Zillow', role: 'Software Engineer' },
    { id: 'p_2', name: 'Lena Hughes', school: 'University of Washington' },
    { id: 'p_3', name: 'Kai Larsen', company: 'Chess Club' },
  ];
  const body = { people, tags: ['Work', 'School', 'Clubs'] };
  const postTo = (app: ReturnType<typeof createApp>, path: string, b: unknown) =>
    app.request(`/api/ai${path}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) });

  it('applies guardrails: unknown ids, ring 1, unknown tags, duplicates', async () => {
    const generate = vi.fn<Generate>(async () =>
      JSON.stringify({
        items: [
          { id: 'p_1', ring: 1, primaryTag: 'Work', tags: ['Work', 'VIP'], reason: 'Engineer at Zillow' },
          { id: 'p_ghost', ring: 3, primaryTag: 'Work', tags: [], reason: 'invented' },
          { id: 'p_2', ring: 3, primaryTag: 'Celebrities', tags: [], reason: 'bad tag' },
          { id: 'p_3', ring: 3, primaryTag: 'Clubs', tags: ['Clubs'], reason: 'Chess Club member' },
          { id: 'p_3', ring: 2, primaryTag: 'Work', tags: [], reason: 'duplicate' },
        ],
      }),
    );
    const res = await postTo(appWith(generate), '/classify', body);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      items: [
        { id: 'p_1', ring: 2, primaryTag: 'Work', tags: ['Work'], reason: 'Engineer at Zillow' },
        { id: 'p_3', ring: 3, primaryTag: 'Clubs', tags: ['Clubs'], reason: 'Chess Club member' },
      ],
    });
    expect(generate.mock.calls[0]![0].system).toContain('sort newly imported contacts');
  });

  it('rejects more than 150 people and oversized fields', async () => {
    const many = Array.from({ length: 151 }, (_, i) => ({ id: `p_${i}`, name: 'X' }));
    expect((await postTo(appWith(null), '/classify', { people: many, tags: ['Work'] })).status).toBe(400);
    expect((await postTo(appWith(null), '/classify', { people: [{ id: 'p', name: 'x'.repeat(121) }], tags: ['Work'] })).status).toBe(400);
  });
});

describe('POST /api/ai/links', () => {
  const postTo = (app: ReturnType<typeof createApp>, b: unknown) =>
    app.request('/api/ai/links', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) });

  it('keeps only new links between real, different people, once per pair', async () => {
    const generate = vi.fn<Generate>(async () =>
      JSON.stringify({
        links: [
          { fromId: 'p_abbey', toId: 'p_john', label: 'both UW, both Microsoft', confidence: 0.9 },
          { fromId: 'p_john', toId: 'p_abbey', label: 'same pair reversed', confidence: 0.9 },
          { fromId: 'p_abbey', toId: 'p_abbey', label: 'self', confidence: 0.9 },
          { fromId: 'p_abbey', toId: 'p_ghost', label: 'invented', confidence: 0.9 },
          { fromId: 'p_abbey', toId: 'p_01', label: 'already linked', confidence: 0.9 },
        ],
      }),
    );
    const extended = summary + '\nP|p_01|Someone|3|Work|Work|Microsoft|||';
    const res = await postTo(appWith(generate), { summary: extended });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ links: [{ fromId: 'p_abbey', toId: 'p_john', label: 'both UW, both Microsoft', confidence: 0.9 }] });
    expect(generate.mock.calls[0]![0].thinking).toBe('medium');
  });
});

// M8
describe('POST /api/ai/weekly-review', () => {
  const today = new Date();
  const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const inDays = (n: number) => iso(new Date(today.getFullYear(), today.getMonth(), today.getDate() + n));
  const weeklySummary = summary + '\nP|p_01|Someone|3|Work|Work|Microsoft|||' + '\nP|p_02|Other|2|School|School|||University of Washington||';
  const candidates = [
    { kind: 'follow_up', personId: 'p_john', reminderId: 'r1', dueDate: inDays(1), note: 'career fair' },
    { kind: 'reconnect', personId: 'p_john', daysSinceContact: 210 },
    { kind: 'accept_link', linkId: 'l_s1', fromId: 'p_abbey', toId: 'p_john', label: 'both UW' },
    { kind: 'intro', personIds: ['p_01', 'p_02'], shared: 'Microsoft' },
  ];
  const post = (app: ReturnType<typeof createApp>, b: unknown) =>
    app.request('/api/ai/weekly-review', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) });

  it('keeps only actions that match a candidate, with real ids, links and dates', async () => {
    const generate = vi.fn<Generate>(async () =>
      JSON.stringify({
        headline: '1 follow-up, 1 reconnect, 1 link, 1 intro',
        actions: [
          { kind: 'follow_up', personIds: ['p_john'], title: 'Follow up with John', why: 'Due tomorrow', reminderDate: inDays(2) },
          { kind: 'follow_up', personIds: ['p_john'], title: 'Duplicate', why: 'dup' },
          { kind: 'reconnect', personIds: ['p_john'], title: 'Reconnect with John', why: '210 days', reminderDate: '2020-01-01' },
          { kind: 'reconnect', personIds: ['p_abbey'], title: 'Not a candidate', why: 'invented task' },
          { kind: 'accept_link', personIds: ['p_ghost'], title: 'Accept Abbey ↔ John', why: 'both UW', linkId: 'l_s1' },
          { kind: 'intro', personIds: ['p_02', 'p_01'], title: 'Introduce them', why: 'both Microsoft', reminderDate: '2026-02-30' },
        ],
      }),
    );
    const res = await post(appWith(generate), { summary: weeklySummary, candidates, today: iso(today) });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { actions: Array<Record<string, unknown>> };
    expect(body.actions.map((a) => a.title)).toEqual(['Follow up with John', 'Reconnect with John', 'Accept Abbey ↔ John', 'Introduce them']);
    expect(body.actions[0]).toMatchObject({ reminderDate: inDays(2) });
    expect(body.actions[1]).not.toHaveProperty('reminderDate'); // a past date is dropped
    expect(body.actions[2]).toMatchObject({ linkId: 'l_s1', personIds: ['p_abbey', 'p_john'] }); // people from OUR candidate
    expect(body.actions[3]).not.toHaveProperty('reminderDate'); // Feb 30 doesn't exist
    expect(generate.mock.calls[0]![0].thinking).toBe('medium');
    expect(JSON.stringify(generate.mock.calls[0]![0].parts)).toContain(`Today is ${iso(today)}`);
  });

  it('drops a link the app never offered', async () => {
    const generate = vi.fn<Generate>(async () =>
      JSON.stringify({ headline: 'x', actions: [{ kind: 'accept_link', personIds: ['p_abbey', 'p_john'], title: 'Unknown link', why: 'x', linkId: 'l_made_up' }] }),
    );
    const res = await post(appWith(generate), { summary: weeklySummary, candidates, today: iso(today) });
    expect(((await res.json()) as { actions: unknown[] }).actions).toEqual([]);
  });

  it('rejects more than 40 candidates', async () => {
    const many = Array.from({ length: 41 }, (_, i) => ({ kind: 'reconnect', personId: `p_${i}`, daysSinceContact: 200 }));
    expect((await post(appWith(null), { summary, candidates: many, today: iso(today) })).status).toBe(400);
  });
});

describe('POST /api/ai/draft', () => {
  it('drafts one message, trimmed, with notes sent only for this person', async () => {
    const generate = vi.fn<Generate>(async () => JSON.stringify({ message: '  Hi John, great seeing you at the career fair!  ' }));
    const res = await createApp({ generate, cache: new DemoCache('off') }).request('/api/ai/draft', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ person: { id: 'p_john', name: 'John Park', notes: 'Lab partner in CSE 332' }, sharedConnections: ['Abbey Chen'] }),
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ message: 'Hi John, great seeing you at the career fair!' });
    const text = JSON.stringify(generate.mock.calls[0]![0].parts);
    expect(text).toContain('Lab partner in CSE 332');
    expect(text).toContain('Shared connections: Abbey Chen');
    expect(text).toContain('Purpose: catch up');
  });
});
