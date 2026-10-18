/**
 * M16 — Relay between the texting agent and the user's open browser tab · done
 *
 * WHAT THIS ACHIEVES
 *   Keeps our local-first promise while adding a texting agent. The network
 *   lives only in the user's browser, so the server never answers from data it
 *   holds: it forwards each text to the open Connectwork tab over Server-Sent
 *   Events, waits for the tab's answer, and texts it back. Tab closed → the agent
 *   politely says so. Nothing about the network is stored on the server.
 *
 * HOW IT FITS
 *   photon/agent.ts  → relay.ask(request)  → SSE event to the browser
 *   browser (web lib/relayClient.ts) answers → POST /api/relay/reply → ask() resolves
 *   browser can also POST /api/relay/notify { text } → agent texts the owner (weekly digest)
 *
 * SECURITY
 *   Both endpoints require RELAY_TOKEN (Authorization: Bearer … ; for EventSource,
 *   which can't set headers, a ?token= query parameter). Compare with a
 *   constant-time check (crypto.timingSafeEqual). No token configured → routes return 404.
 *
 * STEPS
 *   1. RelayHub state: the current SSE stream (one browser at a time is fine for the
 *      MVP — a newer connection replaces the older one) and a Map<requestId, {resolve, timer}>.
 *   2. GET /api/relay/stream: check the token; use hono/streaming `streamSSE`; keep a
 *      reference to the stream; send a `ping` event every 25 s so proxies keep it open;
 *      on abort, clear the reference.
 *   3. ask(req, timeoutMs = 20_000): if no stream → return null immediately; else write
 *      an SSE event { event: 'request', data: JSON.stringify(req) } and return a Promise that
 *      resolves with the RelayReply or null on timeout.
 *   4. POST /api/relay/reply: check the token; validate with RelayReply (shared schema);
 *      resolve the pending promise by id; 404 if the id is unknown or expired.
 *   5. POST /api/relay/notify: check the token; validate { text } (≤ 1200 chars); call the
 *      `notify` callback the agent registered (onNotify) to text the owner.
 *   6. Mount in app.ts: app.route('/api/relay', relayRoutes(hub)) — only when env.relayToken is set.
 *      The hub instance is shared with photon/agent.ts (create it in index.ts, pass to both).
 *   7. Tests (photon/relay.test.ts): wrong token → 401; ask() with no browser → null;
 *      ask() resolves when a reply with the same id is posted; times out to null.
 *
 * DONE WHEN
 *   - With the app open, a test request round-trips browser → server in under a second;
 *     with the app closed, ask() returns null at once.
 *
 * Contract: RelayRequest / RelayReply · Guide: docs/IMPLEMENTATION_GUIDE.md §23
 */
import { timingSafeEqual } from 'node:crypto';
import type { Context, Hono } from 'hono';
import { streamSSE, type SSEStreamingApi } from 'hono/streaming';
import { z } from 'zod';
import { RelayReply, type RelayRequest } from '@connectwork/shared';
import { env } from '../env';

interface Pending {
  resolve: (reply: RelayReply | null) => void;
  timer: ReturnType<typeof setTimeout>;
}

export class RelayHub {
  // Step 1. One browser at a time (a newer tab replaces the older one) + replies we're waiting for.
  private stream: SSEStreamingApi | null = null;
  private readonly pending = new Map<string, Pending>();
  private notify: ((text: string) => Promise<void>) | null = null;

  /** True while a browser tab is subscribed. */
  get connected(): boolean {
    return this.stream !== null && !this.stream.aborted && !this.stream.closed;
  }

  /** Step 2 helper: the newest tab wins; the old stream is closed so it stops pinging. */
  attach(stream: SSEStreamingApi): void {
    if (this.stream && this.stream !== stream) void this.stream.close();
    this.stream = stream;
  }

  detach(stream: SSEStreamingApi): void {
    if (this.stream === stream) this.stream = null;
  }

  /** Step 3. Forward a text to the browser and wait for its reply; null if no tab is open or it times out. */
  async ask(request: RelayRequest, timeoutMs = 20_000): Promise<RelayReply | null> {
    const stream = this.connected ? this.stream : null;
    if (!stream) return null;
    return new Promise<RelayReply | null>((resolve) => {
      const timer = setTimeout(() => {
        this.pending.delete(request.id);
        resolve(null);
      }, timeoutMs);
      this.pending.set(request.id, { resolve, timer });
      stream.writeSSE({ event: 'request', data: JSON.stringify(request), id: request.id }).catch(() => {
        clearTimeout(timer);
        this.pending.delete(request.id);
        resolve(null);
      });
    });
  }

  /** Step 4 helper: the browser's answer. False when nobody is waiting for that id (late or unknown). */
  resolve(reply: RelayReply): boolean {
    const p = this.pending.get(reply.id);
    if (!p) return false;
    clearTimeout(p.timer);
    this.pending.delete(reply.id);
    p.resolve(reply);
    return true;
  }

  /** The agent registers how to text the owner (used by /notify, e.g. the weekly digest). */
  onNotify(send: (text: string) => Promise<void>): void {
    this.notify = send;
  }

  /** Step 5 helper. False when no agent is running to send it. */
  async sendToOwner(text: string): Promise<boolean> {
    if (!this.notify) return false;
    await this.notify(text);
    return true;
  }
}

/** Constant-time token check: the comparison takes as long whether 1 or 40 characters match. */
export function tokenMatches(given: string | undefined, expected: string): boolean {
  if (!expected || !given) return false;
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

const NotifyBody = z.object({ text: z.string().trim().min(1).max(1200) });

/** Steps 2, 4, 5. Mounted by app.ts under /api/relay, only when RELAY_TOKEN is set (step 6). */
export function relayRoutes(hub: RelayHub, routes: Hono, token: string = env.relayToken): void {
  // EventSource can't set headers, so the stream accepts ?token= as well as the Authorization header.
  const authorized = (c: Context, allowQuery = false) =>
    tokenMatches(c.req.header('authorization')?.replace(/^Bearer\s+/i, ''), token) || (allowQuery && tokenMatches(c.req.query('token'), token));

  routes.get('/stream', (c) => {
    if (!authorized(c, true)) return c.json({ error: 'unauthorized', message: 'Wrong relay token' }, 401);
    return streamSSE(c, async (stream) => {
      hub.attach(stream);
      stream.onAbort(() => hub.detach(stream));
      await stream.writeSSE({ event: 'ready', data: '{}' });
      // Pings keep proxies (Caddy, Cloudflare) from closing an idle stream.
      while (!stream.aborted && !stream.closed) {
        await stream.sleep(25_000);
        if (!stream.aborted && !stream.closed) await stream.writeSSE({ event: 'ping', data: '{}' }).catch(() => undefined);
      }
      hub.detach(stream);
    });
  });

  routes.post('/reply', async (c) => {
    if (!authorized(c)) return c.json({ error: 'unauthorized', message: 'Wrong relay token' }, 401);
    const parsed = RelayReply.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) return c.json({ error: 'bad_request', message: 'Invalid reply' }, 400);
    return hub.resolve(parsed.data) ? c.json({ ok: true }) : c.json({ error: 'not_found', message: 'No text is waiting for that reply' }, 404);
  });

  routes.post('/notify', async (c) => {
    if (!authorized(c)) return c.json({ error: 'unauthorized', message: 'Wrong relay token' }, 401);
    const parsed = NotifyBody.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) return c.json({ error: 'bad_request', message: 'Invalid text' }, 400);
    return (await hub.sendToOwner(parsed.data.text)) ? c.json({ ok: true }) : c.json({ error: 'ai_unavailable', message: 'The texting agent is not running' }, 503);
  });
}
