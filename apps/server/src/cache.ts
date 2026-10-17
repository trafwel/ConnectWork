/**
 * M5 — Demo reply cache · done (used for the demo in M12)
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
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

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
export function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${canonicalJson(v)}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

// Step 1. The key reveals nothing about the request: it's a hash.
export function cacheKey(route: string, body: unknown): string {
  return createHash('sha256').update(`${route}\n${canonicalJson(body)}`).digest('hex');
}

const DEFAULT_FILE = fileURLToPath(new URL('../../../demo/demo-cache.json', import.meta.url));

/**
 * Recorded AI replies for the scripted demo. The file holds model ANSWERS (which name
 * people), so record only with the fictional demo data.
 */
export class DemoCache {
  private entries: Record<string, unknown>;

  constructor(
    readonly mode: CacheMode,
    private readonly file: string = DEFAULT_FILE,
  ) {
    // Step 2
    this.entries = mode !== 'off' && existsSync(file) ? (JSON.parse(readFileSync(file, 'utf8')) as Record<string, unknown>) : {};
  }

  // Step 3
  get(key: string): unknown {
    return this.mode === 'replay' ? this.entries[key] : undefined;
  }

  // Step 4. Write to a temp file, then rename: a crash mid-write can't leave half a JSON file.
  set(key: string, value: unknown): void {
    if (this.mode !== 'record') return;
    this.entries[key] = value;
    const tmp = `${this.file}.tmp`;
    writeFileSync(tmp, JSON.stringify(this.entries, null, 2) + '\n');
    renameSync(tmp, this.file);
  }
}
