import type { Link, Person, Reminder, Ring } from '@connectwork/shared';
import { FALLBACK_COLOR } from '@/lib/colors';
import { addDays, isoDate, today } from '@/lib/dates';
import { newId } from '@/lib/ids';
import { db } from './db';

export async function addPerson(input: { name: string; ring: Ring; primaryTag: string } & Partial<Person>): Promise<Person> {
  const person: Person = {
    tags: [input.primaryTag],
    source: 'manual',
    lastContact: today(),
    ...input,
    id: input.id ?? newId('p'),
    name: input.name.trim(),
    createdAt: new Date().toISOString(),
  };
  await db.people.add(person);
  return person;
}

export async function updatePerson(id: string, patch: Partial<Omit<Person, 'id'>>) {
  await db.transaction('rw', [db.people, db.tags, db.reminders], async () => {
    const before = await db.people.get(id);
    if (!before) return;
    const next = { ...before, ...patch };
    if (patch.primaryTag && !next.tags.includes(patch.primaryTag)) next.tags = [patch.primaryTag, ...next.tags];
    await db.people.put(next);

    // Unknown tag names become new tags so they get a color and show in filters.
    for (const name of next.tags) {
      if (!(await db.tags.get(name))) await db.tags.put({ name, color: FALLBACK_COLOR, behavior: 'none' });
    }

    // Adding a follow-up tag schedules a reminder if none is open.
    const followUps = (await db.tags.toArray()).filter((t) => t.behavior === 'follow-up').map((t) => t.name);
    const gainedFollowUp = next.tags.some((t) => followUps.includes(t) && !before.tags.includes(t));
    if (gainedFollowUp) {
      const open = await db.reminders.where('personId').equals(id).filter((r) => !r.done).count();
      if (!open) await addReminder(id, isoDate(addDays(new Date(), 7)), 'Follow up');
    }
  });
}

export async function deletePerson(id: string) {
  await db.transaction('rw', [db.people, db.links, db.reminders, db.contactLogs], async () => {
    await db.people.delete(id);
    await db.links.where('fromId').equals(id).or('toId').equals(id).delete();
    await db.reminders.where('personId').equals(id).delete();
    await db.contactLogs.where('personId').equals(id).delete();
  });
}

/** Records real contact: always writes a ContactLog alongside lastContact. */
export async function logContact(personId: string, kind: 'meeting' | 'message' | 'other' = 'other', note?: string) {
  const date = today();
  await db.transaction('rw', [db.people, db.contactLogs], async () => {
    await db.contactLogs.add({ id: newId('c'), personId, date, kind, note });
    await db.people.update(personId, { lastContact: date });
  });
}

export async function addReminder(personId: string, dueDate: string, note: string): Promise<Reminder> {
  const reminder: Reminder = { id: newId('r'), personId, dueDate, note: note.trim() || 'Follow up', done: false };
  await db.reminders.add(reminder);
  return reminder;
}

export const setReminderDone = (id: string, done: boolean) => db.reminders.update(id, { done });
export const snoozeReminder = async (id: string, days = 7) => {
  const r = await db.reminders.get(id);
  if (r) await db.reminders.update(id, { dueDate: isoDate(addDays(new Date(), days)) });
};
export const deleteReminder = (id: string) => db.reminders.delete(id);

/** Links are undirected and stored with fromId < toId. */
export function normalizeLink(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a];
}

export async function upsertLink(a: string, b: string, data: Pick<Link, 'source' | 'status'> & { label?: string }) {
  const [fromId, toId] = normalizeLink(a, b);
  if (fromId === toId) return;
  const existing = await db.links.where({ fromId }).filter((l) => l.toId === toId).first();
  if (existing) {
    // Never downgrade an accepted link back to suggested.
    if (existing.status === 'accepted' && data.status === 'suggested') return;
    await db.links.update(existing.id, { ...data, label: data.label ?? existing.label });
  } else {
    await db.links.add({ id: newId('l'), fromId, toId, ...data });
  }
}

export const acceptLink = (id: string) => db.links.update(id, { status: 'accepted' });
export const removeLink = (id: string) => db.links.delete(id);

/** Writes an import plan in one transaction. New people land in ring 3 unless the file says otherwise. */
export async function applyImport(
  plan: { toAdd: Array<Partial<Person> & { name: string }>; toUpdate: Array<{ id: string; patch: Partial<Person> }> },
  source: Person['source'],
  defaultTag: string,
): Promise<string[]> {
  const createdAt = new Date().toISOString();
  const people: Person[] = plan.toAdd.map((d) => {
    const tags = d.tags?.length ? d.tags : [defaultTag];
    return {
      ...d,
      id: newId('p'),
      name: d.name.trim(),
      ring: d.ring ?? 3,
      primaryTag: tags[0]!,
      tags,
      lastContact: d.lastContact ?? d.metAt,
      source,
      createdAt,
    };
  });
  await db.transaction('rw', [db.people, db.tags], async () => {
    await db.people.bulkAdd(people);
    for (const u of plan.toUpdate) await db.people.update(u.id, u.patch);
    for (const name of new Set(people.flatMap((p) => p.tags))) {
      if (!(await db.tags.get(name))) await db.tags.put({ name, color: FALLBACK_COLOR, behavior: 'none' });
    }
  });
  return people.map((p) => p.id);
}
