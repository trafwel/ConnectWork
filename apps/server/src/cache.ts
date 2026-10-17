import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export type CacheMode = 'off' | 'record' | 'replay';

/** Stable JSON: object keys sorted so equal bodies give equal cache keys. */
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
