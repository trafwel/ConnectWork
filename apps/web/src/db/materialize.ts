/**
 * M1 — Turn seed offsets into real dates · Owner: Person B · ~20 min
 *
 * WHAT THIS ACHIEVES
 *   Keeps the demo current forever: "contacted 210 days ago" and "due tomorrow"
 *   are computed from today's date at load time, not frozen in the file.
 *
 * HOW IT FITS
 *   Pure function (no Dexie import) so Vitest can test it in Node; db/seed.ts
 *   calls it with demo/seed.json and writes the result.
 *
 * STEPS
 *   1. `const ago = (days?: number) => days === undefined ? undefined : isoDate(addDays(now, -days));`
 *      (isoDate/addDays from lib/dates.ts — use the LOCAL calendar date.)
 *   2. people: copy each field; metAt = ago(metDaysAgo); lastContact = ago(lastContactDaysAgo);
 *      ring cast to Person['ring']; source: 'seed'; createdAt: now.toISOString().
 *   3. links: { ...l, source: 'user', status: 'accepted' } (seed links are already fromId < toId).
 *   4. reminders: dueDate = isoDate(addDays(now, r.dueInDays)); done: false.
 *   5. Return { people, links, reminders }.
 *
 * DONE WHEN
 *   - db/seed.test.ts passes (unskip it): for now = Oct 17 2026, John's lastContact is
 *     2026-03-21 and his reminder is due 2026-10-18; Abbey and John are not linked.
 *
 * Guide: §5.3
 */
import type { Link, Person, Reminder } from '@connectwork/shared';
import type seed from '../../../../demo/seed.json';

export type SeedFile = typeof seed;

export function materializeSeed(_file: SeedFile, _now = new Date()): { people: Person[]; links: Link[]; reminders: Reminder[] } {
  // TODO(M1) steps 1–5
  return { people: [], links: [], reminders: [] };
}
