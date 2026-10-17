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

describe('POST /api/ai/classify (M6)', () => {
  const body = {
    people: [
      { id: 'p_1', name: 'Ada Lovelace', company: 'Analytical Engines' },
      { id: 'p_2', name: 'Grace Hopper', company: 'Navy' },
    ],
    tags: ['Work', 'School', 'Friends'],
  };
  const postClassify = (app: ReturnType<typeof createApp>, b: unknown) =>
    app.request('/api/ai/classify', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) });

  it('drops unknown people and tags, and never returns ring 1', async () => {
    const generate = vi.fn<Generate>(async () =>
      JSON.stringify({
        items: [
          { id: 'p_1', ring: 1, primaryTag: 'Work', tags: ['Work', 'Secret'], reason: 'same company' },
          { id: 'p_2', ring: 3, primaryTag: 'Military', tags: [], reason: 'navy' },
          { id: 'p_ghost', ring: 2, primaryTag: 'Work', tags: [], reason: 'invented' },
          { id: 'p_1', ring: 3, primaryTag: 'School', tags: [], reason: 'duplicate' },
        ],
      }),
    );
    const res = await postClassify(appWith(generate), body);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ items: [{ id: 'p_1', ring: 2, primaryTag: 'Work', tags: ['Work'], reason: 'same company' }] });
    expect(generate.mock.calls[0]![0].thinking).toBe('low');
  });

  it('rejects more than 150 people per call', async () => {
    const many = Array.from({ length: 151 }, (_, i) => ({ id: `p_${i}`, name: `P ${i}` }));
    const res = await postClassify(appWith(vi.fn<Generate>()), { people: many, tags: ['Work'] });
    expect(res.status).toBe(400);
  });
});

describe('POST /api/ai/links (M6)', () => {
  const postLinks = (app: ReturnType<typeof createApp>, b: unknown) =>
    app.request('/api/ai/links', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) });

  it('keeps only new links between real, different people', async () => {
    const generate = vi.fn<Generate>(async () =>
      JSON.stringify({
        links: [
          { fromId: 'p_abbey', toId: 'p_john', label: 'both UW, both Microsoft', confidence: 0.85 },
          { fromId: 'p_john', toId: 'p_abbey', label: 'duplicate pair', confidence: 0.8 },
          { fromId: 'p_abbey', toId: 'p_abbey', label: 'self', confidence: 0.9 },
          { fromId: 'p_abbey', toId: 'p_ghost', label: 'invented', confidence: 0.9 },
        ],
      }),
    );
    const res = await postLinks(appWith(generate), { summary });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ links: [{ fromId: 'p_abbey', toId: 'p_john', label: 'both UW, both Microsoft', confidence: 0.85 }] });
    expect(generate.mock.calls[0]![0].thinking).toBe('medium');
  });

  it('drops pairs that are already linked', async () => {
    const linked = summary.replace('L|p_abbey|p_01|same team', 'L|p_john|p_abbey|already');
    const generate = vi.fn<Generate>(async () =>
      JSON.stringify({ links: [{ fromId: 'p_abbey', toId: 'p_john', label: 'both UW', confidence: 0.9 }] }),
    );
    const res = await postLinks(appWith(generate), { summary: linked });
    expect(await res.json()).toEqual({ links: [] });
  });
});
