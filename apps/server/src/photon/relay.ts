/**
 * M16 — Relay between the texting agent and the user's open browser tab · Owner: Person B · ~1 h
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
import type { Hono } from 'hono';
import type { RelayReply, RelayRequest } from '@connectwork/shared';

export class RelayHub {
  /** True while a browser tab is subscribed. */
  get connected(): boolean {
    // TODO(M16) step 1
    return false;
  }

  /** Forward a text to the browser and wait for its reply; null if no tab is open or it times out. */
  async ask(_request: RelayRequest, _timeoutMs = 20_000): Promise<RelayReply | null> {
    // TODO(M16) step 3
    return null;
  }

  /** The agent registers how to text the owner (used by /notify, e.g. the weekly digest). */
  onNotify(_send: (text: string) => Promise<void>): void {
    // TODO(M16) step 5
  }
}

export function relayRoutes(_hub: RelayHub, _routes: Hono): void {
  // TODO(M16) steps 2, 4, 5 — then mount from app.ts (step 6)
}
