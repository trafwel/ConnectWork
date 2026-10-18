import { describe, expect, it } from 'vitest';
import { Hono } from 'hono';
import type { RelayRequest } from '@connectwork/shared';
import { RelayHub, relayRoutes, tokenMatches } from './relay';

const TOKEN = 'test-relay-token-1234567890';
const request = (id: string): RelayRequest => ({ id, platform: 'imessage', text: 'who do I know at Microsoft?', intent: { intent: 'query', question: 'who do I know at Microsoft?' }, receivedAt: '2026-10-18T15:00:00Z' });

function setup() {
  const hub = new RelayHub();
  const app = new Hono();
  const routes = new Hono();
  relayRoutes(hub, routes, TOKEN);
  app.route('/api/relay', routes);
  return { hub, app };
}

describe('relay (M16)', () => {
  it('rejects a wrong or missing token everywhere', async () => {
    const { app } = setup();
    expect((await app.request('/api/relay/stream?token=nope')).status).toBe(401);
    expect((await app.request('/api/relay/reply', { method: 'POST', body: '{}' })).status).toBe(401);
    expect((await app.request('/api/relay/notify', { method: 'POST', headers: { authorization: 'Bearer nope' }, body: '{}' })).status).toBe(401);
    expect(tokenMatches(TOKEN, TOKEN)).toBe(true);
    expect(tokenMatches(TOKEN.slice(0, -1), TOKEN)).toBe(false);
    expect(tokenMatches('anything', '')).toBe(false);
  });

  it('tells the old tab it was replaced when a newer tab connects (Oct 18)', async () => {
    const { hub, app } = setup();
    const first = (await app.request(`/api/relay/stream?token=${TOKEN}`)).body!.getReader();
    await first.read(); // ready
    const second = (await app.request(`/api/relay/stream?token=${TOKEN}`)).body!.getReader();
    await second.read(); // ready: the newer tab is attached
    const { value } = await first.read();
    expect(new TextDecoder().decode(value)).toContain('event: replaced');
    expect(hub.connected).toBe(true);
    await second.cancel();
  });

  it('answers null at once when no tab is open', async () => {
    const { hub } = setup();
    const t = Date.now();
    expect(await hub.ask(request('a'))).toBeNull();
    expect(Date.now() - t).toBeLessThan(50);
  });

  it('round-trips: stream → request event → reply resolves ask()', async () => {
    const { hub, app } = setup();
    const res = await app.request(`/api/relay/stream?token=${TOKEN}`);
    expect(res.status).toBe(200);
    const reader = res.body!.getReader();
    await reader.read(); // the 'ready' event: the tab is attached
    expect(hub.connected).toBe(true);

    const pending = hub.ask(request('r1'), 2000);
    const { value } = await reader.read();
    expect(new TextDecoder().decode(value)).toContain('event: request');

    const reply = await app.request('/api/relay/reply', {
      method: 'POST',
      headers: { authorization: `Bearer ${TOKEN}`, 'content-type': 'application/json' },
      body: JSON.stringify({ id: 'r1', text: 'Abbey Chen (Microsoft PM)', personIds: ['p_abbey'] }),
    });
    expect(reply.status).toBe(200);
    expect(await pending).toEqual({ id: 'r1', text: 'Abbey Chen (Microsoft PM)', personIds: ['p_abbey'] });
    // A late or unknown reply is refused.
    const late = await app.request('/api/relay/reply', { method: 'POST', headers: { authorization: `Bearer ${TOKEN}` }, body: JSON.stringify({ id: 'r1', text: 'again' }) });
    expect(late.status).toBe(404);
    await reader.cancel();
  });

  it('times out to null when the tab never answers', async () => {
    const { hub, app } = setup();
    const res = await app.request(`/api/relay/stream?token=${TOKEN}`);
    const reader = res.body!.getReader();
    await reader.read();
    expect(await hub.ask(request('slow'), 30)).toBeNull();
    await reader.cancel();
  });

  it('notify needs a running agent', async () => {
    const { hub, app } = setup();
    const post = () => app.request('/api/relay/notify', { method: 'POST', headers: { authorization: `Bearer ${TOKEN}` }, body: JSON.stringify({ text: 'Your week: 3 follow-ups' }) });
    expect((await post()).status).toBe(503);
    const sent: string[] = [];
    hub.onNotify(async (t) => void sent.push(t));
    expect((await post()).status).toBe(200);
    expect(sent).toEqual(['Your week: 3 follow-ups']);
  });
});
