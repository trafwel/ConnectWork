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
