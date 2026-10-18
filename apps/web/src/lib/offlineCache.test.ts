import { afterEach, describe, expect, it, vi } from 'vitest';
import { cacheKeyAsync } from '@connectwork/shared';
import { askQuery } from './api';
import { cacheKeyInBrowser, lookupOffline, setOfflineEntriesForTest } from './offlineCache';

const summary = 'P|p_abbey|Abbey Chen|Microsoft';
const answer = { answer: 'You know Abbey Chen at Microsoft.', personIds: ['p_abbey'], filterHint: 'none' };

async function record() {
  // What the server stores: the key of the PARSED body (question trimmed).
  setOfflineEntriesForTest({ [await cacheKeyAsync('/api/ai/query', { question: 'Who do I know at Microsoft?', summary })]: answer });
}
const reply = (status: number, body: unknown) => vi.fn(async () => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } }));

afterEach(() => vi.unstubAllGlobals());

describe('cacheKeyInBrowser', () => {
  it('parses with the route schema first, like the server (trimmed question = same key)', async () => {
    expect(await cacheKeyInBrowser('/api/ai/query', { question: '  Who do I know at Microsoft?  ', summary })).toBe(
      await cacheKeyAsync('/api/ai/query', { question: 'Who do I know at Microsoft?', summary }),
    );
  });
  it('gives no key for unknown routes or invalid bodies', async () => {
    expect(await cacheKeyInBrowser('/api/ai/nope', {})).toBeNull();
    expect(await cacheKeyInBrowser('/api/ai/query', { question: '' })).toBeNull();
  });
});

describe('offline fallback in the API client', () => {
  it('answers from the recording when the network is down', async () => {
    await record();
    vi.stubGlobal('fetch', vi.fn(async () => Promise.reject(new TypeError('Failed to fetch'))));
    expect(await askQuery('Who do I know at Microsoft?', summary)).toEqual({ ok: true, data: answer });
  });

  it('answers from the recording when Gemini is unavailable, or the proxy returns an error page', async () => {
    await record();
    vi.stubGlobal('fetch', reply(503, { error: 'ai_unavailable', message: 'The AI did not respond' }));
    expect((await askQuery('Who do I know at Microsoft?', summary)).ok).toBe(true);
    vi.stubGlobal('fetch', vi.fn(async () => new Response('<html>Bad Gateway</html>', { status: 502 })));
    expect((await askQuery('Who do I know at Microsoft?', summary)).ok).toBe(true);
  });

  it('never hides a real error, and a question that was not recorded still fails honestly', async () => {
    await record();
    vi.stubGlobal('fetch', reply(400, { error: 'bad_request', message: 'Invalid request body' }));
    expect(await askQuery('Who do I know at Microsoft?', summary)).toMatchObject({ ok: false, error: 'bad_request' });
    vi.stubGlobal('fetch', vi.fn(async () => Promise.reject(new TypeError('Failed to fetch'))));
    expect(await askQuery('Who do I know at Amazon?', summary)).toMatchObject({ ok: false, error: 'ai_unavailable' });
    expect(await lookupOffline('/api/ai/query', { question: 'Who do I know at Amazon?', summary })).toBeUndefined();
    vi.stubGlobal('fetch', vi.fn(async () => new Response('<html>Bad Gateway</html>', { status: 502 })));
    expect(await askQuery('Who do I know at Amazon?', summary)).toMatchObject({ ok: false, message: "Can't reach the Connectwork server." });
  });
});
