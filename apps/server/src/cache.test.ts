import { describe, expect, it } from 'vitest';
import { cacheKeyAsync } from '@connectwork/shared';
import { cacheKey } from './cache';

// M12: the browser's offline fallback finds a recorded reply only if it computes the SAME key.
describe('demo-cache keys: server (node:crypto) and browser (Web Crypto) agree', () => {
  const bodies: Array<[string, unknown]> = [
    ['/api/ai/query', { question: 'Who do I know at Microsoft?', summary: 'P|p_abbey|Abbey Chen|…' }],
    ['/api/ai/query', { summary: 'x', question: 'Ünïcödé — "quotes" & emoji 🎉', driftDays: undefined }],
    ['/api/ai/meeting-brief', { meeting: { title: 'Coffee with John', start: '2026-10-17T22:30:00.000Z' }, attendees: [{ id: 'p_john', name: 'John Park' }], links: [], reminders: ['John Park: Career fair (due 2026-10-18)'] }],
    ['/api/ai/extract', { image: { mimeType: 'application/pdf', dataBase64: 'JVBERi0xLjcK' }, tags: ['Work', 'School'] }],
  ];
  it.each(bodies)('%s', async (route, body) => {
    expect(await cacheKeyAsync(route, body)).toBe(cacheKey(route, body));
  });

  it('ignores key order and undefined fields (canonical JSON)', async () => {
    expect(await cacheKeyAsync('/r', { b: 1, a: [{ y: 2, x: undefined }] })).toBe(cacheKey('/r', { a: [{ y: 2 }], b: 1 }));
  });
});
