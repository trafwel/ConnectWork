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

import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/db';
import { GROUP_COLORS, PRIMARY_TAGS } from '@/lib/colors';

const NEW = '\u0000new'; // can't collide with a real group name (tags are trimmed text)

export function TagSelect({ value, onChange, onNew, id }: { value: string; onChange: (tag: string) => void; onNew?: () => void; id?: string }) {
  // Oct 18: groups made by dropping people onto each other (they get a GROUP_COLORS color) are
  // choices here too: the keyboard and list-view way to join one.
  const made = useLiveQuery(() => db.tags.filter((t) => GROUP_COLORS.includes(t.color) && !PRIMARY_TAGS.includes(t.name)).toArray(), []) ?? [];
  const all = [...PRIMARY_TAGS, ...made.map((t) => t.name)];
  const options = all.includes(value) ? all : [value, ...all];
  return (
    <select id={id} value={value} onChange={(e) => (e.target.value === NEW ? onNew?.() : onChange(e.target.value))} className="h-8 rounded-md border bg-background px-2 text-sm">
      {options.map((t) => (
        <option key={t} value={t}>
          {t}
        </option>
      ))}
      {/* Oct 18: the person card can start a new group from here (keyboard path for MP-O1). */}
      {onNew && <option value={NEW}>New group…</option>}
    </select>
  );
}
