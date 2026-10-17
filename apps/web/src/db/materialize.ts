/**
 * M1 — Turn seed offsets into real dates · done
 *
 * WHAT THIS ACHIEVES
 *   Keeps the demo current forever: "contacted 210 days ago" and "due tomorrow"
 *   are computed from today's date at load time.
 *
 * HOW IT FITS
 *   Pure function (no Dexie import) so Vitest can run it in Node; seed.ts calls it.
 *
 * HOW IT WAS BUILT
 *   1. metDaysAgo / lastContactDaysAgo → isoDate(today − n days).
 *   2. dueInDays → isoDate(today + n days).
 *   3. Seed links become accepted user links; every person gets source 'seed'.
 *
 * DONE WHEN
 *   - db/seed.test.ts passes (John's dates resolve correctly for a fixed "now").
 *
 * Guide: §5.3
 */
import type { Link, Person, Reminder } from '@connectwork/shared';
import type seed from '../../../../demo/seed.json';
import { addDays, isoDate } from '../lib/dates';

export type SeedFile = typeof seed;

/** Turns the day offsets in demo/seed.json into dates relative to today. */
export function materializeSeed(file: SeedFile, now = new Date()) {
  const ago = (days?: number) => (days === undefined ? undefined : isoDate(addDays(now, -days)));
  const createdAt = now.toISOString();

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
    source: 'seed',
    createdAt,
  }));
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
