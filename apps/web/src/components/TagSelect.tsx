/**
 * M3 — Primary tag picker · Owner: Person A · ~10 min
 *
 * WHAT THIS ACHIEVES
 *   Picks the tag that sets a person's color. A NATIVE <select> gives correct
 *   keyboard and screen-reader behavior for free.
 *
 * STEPS
 *   1. options = PRIMARY_TAGS; if the current value isn't one of them (a custom tag),
 *      put it first so editing never silently changes it.
 *   2. <select value onChange={(e) => onChange(e.target.value)} className="h-8 rounded-md border bg-background px-2 text-sm">
 *
 * Guide: §7.2
 */

export function TagSelect(_props: { value: string; onChange: (tag: string) => void; id?: string }) {
  // TODO(M3) steps 1–2
  return null;
}
