/**
 * M12 — Offline fallback for the demo · Owner: Person B · ~40 min
 *
 * WHAT THIS ACHIEVES
 *   Hackathon Wi-Fi fails and the free Gemini tier gets overloaded (we saw 75 s
 *   responses and 429s on Oct 17). With recorded replies bundled into the app,
 *   the scripted demo works even with the server unreachable — judges always
 *   see the full flow.
 *
 * HOW IT FITS
 *   Server side already exists: DEMO_CACHE=record writes demo/demo-cache.json,
 *   DEMO_CACHE=replay serves it (apps/server/src/cache.ts). This file adds the
 *   browser side: lib/api.ts calls lookupOffline() when fetch() itself fails.
 *
 * STEPS
 *   1. Prerequisite: canonicalJson lives in @connectwork/shared (step R, item 4).
 *   2. cacheKeyInBrowser(route, body): SHA-256 (crypto.subtle.digest) of
 *      `${route}\n${canonicalJson(body)}` as lowercase hex — byte-for-byte the same
 *      key as the server's cacheKey(). Add a test that both produce the same key.
 *   3. lookupOffline(route, body): import demo/demo-cache.json (Vite bundles JSON),
 *      return the entry for the key or undefined.
 *   4. lib/api.ts post(): in the catch for a failed fetch, try lookupOffline first;
 *      if found, return { ok: true, data } (validated with the same schema).
 *   5. Demo-day routine (judging morning): Settings → Reset demo data; DEMO_CACHE=record;
 *      run every scripted action once; switch to DEMO_CACHE=replay; rebuild/redeploy.
 *      Keys include dates relative to today, so record on the day you present.
 *
 * DONE WHEN
 *   - With the server stopped, the scripted questions still get answers in the browser.
 *
 * Guide: §19
 */

export async function cacheKeyInBrowser(_route: string, _body: unknown): Promise<string> {
  // TODO(M12) step 2
  throw new Error('TODO(M12): cacheKeyInBrowser is not implemented yet');
}

export async function lookupOffline(_route: string, _body: unknown): Promise<unknown | undefined> {
  // TODO(M12) step 3
  return undefined;
}
