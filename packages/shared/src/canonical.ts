/**
 * R — Canonical JSON · done
 *
 * WHAT THIS ACHIEVES
 *   Equal request bodies always produce identical text (object keys sorted,
 *   undefined values dropped), so the demo cache key is the same on the server
 *   (Node crypto) and, in M12, in the browser (Web Crypto).
 *
 * Guide: docs/IMPLEMENTATION_GUIDE.md §11, §19
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
