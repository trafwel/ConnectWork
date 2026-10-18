/**
 * M1 — Turn seed offsets into real dates · done
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
import { addDays, isoDate } from '../lib/dates';

export type SeedFile = typeof seed;

export function materializeSeed(file: SeedFile, now = new Date()): { people: Person[]; links: Link[]; reminders: Reminder[] } {
  // Offset in the past → local calendar date. Missing offset stays missing (not "today").
  const ago = (days?: number) => (days === undefined ? undefined : isoDate(addDays(now, -days)));
  const createdAt = now.toISOString(); // a timestamp, not a calendar date, so UTC is right here

  const people: Person[] = file.people.map((p) => ({
    id: p.id,
    name: p.name,
    ring: p.ring as Person['ring'],
    primaryTag: p.primaryTag,
    tags: p.tags,
    company: p.company,
    role: p.role,
    school: p.school,
    email: p.email,
    linkedinUrl: p.linkedinUrl,
    metAt: ago(p.metDaysAgo),
    lastContact: ago(p.lastContactDaysAgo),
    notes: p.notes,
    // Oct 18: the bundled demo portrait, if the generator gave one.
    photo: (p as { photo?: string }).photo,
    source: 'seed',
    createdAt,
  }));
  // Seed links are already stored with fromId < toId, so no re-sorting is needed.
  const links: Link[] = file.links.map((l) => ({ ...l, source: 'user', status: 'accepted' }));
  const reminders: Reminder[] = file.reminders.map((r) => ({
    id: r.id,
    personId: r.personId,
    dueDate: isoDate(addDays(now, r.dueInDays)),
    note: r.note,
    done: false,
  }));
  return { people, links, reminders };
}
