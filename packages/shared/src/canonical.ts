/**
 * Step R — canonical JSON · moved here from apps/server/src/cache.ts
 *
 * Stable JSON: object keys sorted and undefined values dropped, so equal request bodies
 * always give identical text, and so identical demo-cache keys. Shared because M12's
 * offline fallback computes the same key in the browser.
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

/**
 * M12 — the demo-cache key, computed with Web Crypto so it runs in the BROWSER (and in Node,
 * which has the same API). Must equal the server's cacheKey() (node:crypto) byte for byte:
 * SHA-256 of `${route}\n${canonicalJson(body)}` as lowercase hex. cache.test.ts checks both agree.
 */
export async function cacheKeyAsync(route: string, body: unknown): Promise<string> {
  const bytes = new TextEncoder().encode(`${route}\n${canonicalJson(body)}`);
  const hash = await globalThis.crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
