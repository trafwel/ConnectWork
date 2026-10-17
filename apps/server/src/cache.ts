/**
 * M5 — Demo reply cache · Owner: Person B · ~30 min (used for the demo in M12)
 *
 * WHAT THIS ACHIEVES
 *   Record real AI replies once, then replay them — the scripted demo works even
 *   when Gemini is slow, overloaded or offline (which it was, repeatedly, on Oct 17).
 *
 * HOW IT FITS
 *   DEMO_CACHE=record writes demo/demo-cache.json after each successful reply;
 *   DEMO_CACHE=replay serves hits (header x-cache: hit) and only calls Gemini on a miss.
 *   The browser computes the same key in M12, which is why canonicalJson lives in
 *   @connectwork/shared.
 *
 * STEPS
 *   1. cacheKey(route, body) = sha256 hex of `${route}\n${canonicalJson(body)}`
 *      (createHash from node:crypto). canonicalJson sorts object keys, so equal requests
 *      always give equal keys.
 *   2. DemoCache constructor(mode, file = repo-root demo/demo-cache.json):
 *      when mode !== 'off' and the file exists, load it into a Record<string, unknown>.
 *   3. get(key): only in 'replay' mode → entries[key]; otherwise undefined.
 *   4. set(key, value): only in 'record' mode → store and rewrite the file (pretty JSON + newline).
 *
 * DONE WHEN
 *   - The "records replies and replays them" test in routes/ai.test.ts passes.
 *
 * Guide: §9.5, §19
 */
export type CacheMode = 'off' | 'record' | 'replay';

/**
 * Stable JSON: object keys sorted and undefined values dropped, so equal request
 * bodies always produce identical text.
 *   arrays  → `[${items.map(canonicalJson).join(',')}]`
 *   objects → entries without undefined values, sorted by key, as `{"k":<canonicalJson(v)>,…}`
 *   others  → JSON.stringify(value)
 * Step R (guide §11) moves this to packages/shared/src/canonical.ts so the browser (M12)
 * computes the same cache keys.
 */
export function canonicalJson(_value: unknown): string {
  // TODO(M5)
  return '';
}

export function cacheKey(_route: string, _body: unknown): string {
  // TODO(M5) step 1
  return '';
}

export class DemoCache {
  constructor(
    readonly mode: CacheMode,
    _file?: string,
  ) {
    // TODO(M5) step 2
  }

  get(_key: string): unknown {
    // TODO(M5) step 3
    return undefined;
  }

  set(_key: string, _value: unknown): void {
    // TODO(M5) step 4
  }
}
