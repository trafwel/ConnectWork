/**
 * M5 — Demo reply cache · done (used for the demo in M12)
 *
 * WHAT THIS ACHIEVES
 *   Record real AI replies once, then replay them — the scripted demo works even
 *   when Gemini is slow, overloaded or offline.
 *
 * HOW IT FITS
 *   DEMO_CACHE=record writes demo/demo-cache.json after each successful reply;
 *   DEMO_CACHE=replay serves hits (header x-cache: hit) and only calls Gemini on a miss.
 *
 * HOW IT WAS BUILT
 *   1. Key = sha256 of the route + "\n" + canonicalJson(body). canonicalJson sorts
 *      object keys so equal requests always give equal keys.
 *   2. The browser will compute the same key in M12 (canonicalJson moves to the
 *      shared package in step R).
 *
 * Guide: §9.5, §19
 */
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { canonicalJson } from '@connectwork/shared';

export type CacheMode = 'off' | 'record' | 'replay';

// Shared with the browser (M12) so both compute identical cache keys.
export { canonicalJson };

export function cacheKey(route: string, body: unknown): string {
  return createHash('sha256').update(`${route}\n${canonicalJson(body)}`).digest('hex');
}

const DEFAULT_FILE = fileURLToPath(new URL('../../../demo/demo-cache.json', import.meta.url));

/**
 * Recorded AI replies for the scripted demo. `record` saves every successful
 * reply; `replay` serves saved replies and falls through to Gemini on a miss.
 */
export class DemoCache {
  private entries: Record<string, unknown>;

  constructor(
    readonly mode: CacheMode,
    private readonly file: string = DEFAULT_FILE,
  ) {
    this.entries = mode !== 'off' && existsSync(file) ? (JSON.parse(readFileSync(file, 'utf8')) as Record<string, unknown>) : {};
  }

  get(key: string): unknown {
    return this.mode === 'replay' ? this.entries[key] : undefined;
  }

  set(key: string, value: unknown) {
    if (this.mode !== 'record') return;
    this.entries[key] = value;
    writeFileSync(this.file, JSON.stringify(this.entries, null, 2) + '\n');
  }
}
