/**
 * M3 — Primary tag picker · done
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

import { PRIMARY_TAGS } from '@/lib/colors';

export function TagSelect({ value, onChange, id }: { value: string; onChange: (tag: string) => void; id?: string }) {
  const options = PRIMARY_TAGS.includes(value) ? PRIMARY_TAGS : [value, ...PRIMARY_TAGS];
  return (
    <select id={id} value={value} onChange={(e) => onChange(e.target.value)} className="h-8 rounded-md border bg-background px-2 text-sm">
      {options.map((t) => (
        <option key={t} value={t}>
          {t}
        </option>
      ))}
    </select>
  );
}
