/**
 * M3/M4 — Every write to the database · done
 *
 * WHAT THIS ACHIEVES
 *   One place that enforces the app's data rules, so no component can break them:
 *   links are stored once per pair, logging contact always records history,
 *   deleting a person cleans up after them, and imports never overwrite what the
 *   user typed.
 *
 * HOW IT FITS
 *   Components and AI flows call these functions; nothing else calls db.*.put/add/delete.
 *   Reads stay in components (useLiveQuery).
 *
 * STEPS
 *   1. addPerson(input): build a Person with defaults — tags [primaryTag], source 'manual',
 *      lastContact today() — then the input, then id (input.id ?? newId('p')), trimmed name,
 *      createdAt now. db.people.add(person); return it.
 *   2. updatePerson(id, patch), in ONE transaction over people, tags, reminders:
 *      a. merge patch into the stored person; if primaryTag changed, make sure it's in tags;
 *      b. any tag name that doesn't exist in db.tags yet → put { name, color: FALLBACK_COLOR, behavior: 'none' };
 *      c. if the person GAINED a tag whose behavior is 'follow-up' and has no open reminder,
 *         addReminder(id, today + 7 days, 'Follow up').
 *   3. deletePerson(id): one transaction — delete the person, their links
 *      (where('fromId').equals(id).or('toId').equals(id)), reminders and contact logs.
 *   4. logContact(personId, kind = 'other', note?): one transaction — add a ContactLog
 *      { id: newId('c'), personId, date: today(), kind, note } AND set lastContact = today().
 *      (Always both: drift reads lastContact, history reads the logs.)
 *   5. Reminders: addReminder(personId, dueDate, note) (note defaults to "Follow up"),
 *      setReminderDone(id, done), snoozeReminder(id, days = 7) (due = today + days),
 *      deleteReminder(id).
 *   6. Links are undirected: normalizeLink(a, b) returns [smaller, larger].
 *      upsertLink(a, b, { source, status, label? }): skip self-links; find the existing
 *      pair; NEVER downgrade an accepted link back to 'suggested'; otherwise update or add
 *      with id newId('l'). acceptLink(id) sets status 'accepted'; removeLink(id) deletes.
 *   7. (M4) applyImport(plan, source, defaultTag): build Person rows for plan.toAdd —
 *      ring = draft.ring ?? 3, tags = draft.tags or [defaultTag], primaryTag = tags[0],
 *      lastContact = draft.metAt, the given source — then in ONE transaction bulkAdd them,
 *      apply plan.toUpdate patches, and create any unknown tags. Return the new ids
 *      (M6 "Sort with AI" sorts exactly those).
 *
 * DONE WHEN
 *   - Quick add, card edits, reminders, links and delete all persist after reload, and
 *     adding the follow-up tag creates a 7-day reminder.
 *
 * Tests: db/actions.test.ts runs every rule above against an in-memory IndexedDB (fake-indexeddb).
 * Guide: §7.1
 */
import type { ContactLog, Link, Person, Reminder, Ring } from '@connectwork/shared';
import { FALLBACK_COLOR } from '@/lib/colors';
import { addDays, isoDate, today } from '@/lib/dates';
import { newId } from '@/lib/ids';
import { db } from './db';

const inDays = (days: number) => isoDate(addDays(new Date(), days));

/** Creates a tag for every name not in db.tags yet (one bulkGet, not one get per name). */
async function ensureTags(names: Iterable<string>): Promise<void> {
  const unique = [...new Set(names)];
  const existing = await db.tags.bulkGet(unique);
  const missing = unique.filter((_, i) => !existing[i]);
  if (missing.length) await db.tags.bulkPut(missing.map((name) => ({ name, color: FALLBACK_COLOR, behavior: 'none' as const })));
}

// Step 1. Defaults first, then the caller's fields, then what callers may not choose.
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
  if (!person.name) throw new Error('A name is required');
  if (!person.tags.includes(person.primaryTag)) person.tags = [person.primaryTag, ...person.tags];
  await db.transaction('rw', [db.people, db.tags], async () => {
    await db.people.add(person);
    await ensureTags(person.tags);
  });
  return person;
}

// Step 2. One transaction: the person, any new tags, and a follow-up reminder land together.
export async function updatePerson(id: string, patch: Partial<Omit<Person, 'id'>>): Promise<void> {
  await db.transaction('rw', [db.people, db.tags, db.reminders], async () => {
    const before = await db.people.get(id);
    if (!before) return;
    const next: Person = { ...before, ...patch, id };
    next.name = next.name.trim() || before.name; // a blank name would leave an empty card title
    if (!next.tags.includes(next.primaryTag)) next.tags = [next.primaryTag, ...next.tags];
    await db.people.put(next);
    await ensureTags(next.tags);

    // Gaining a follow-up tag schedules a reminder in a week, unless one is already open.
    const followUpTags = new Set((await db.tags.filter((t) => t.behavior === 'follow-up').toArray()).map((t) => t.name));
    const gained = next.tags.some((t) => followUpTags.has(t) && !before.tags.includes(t));
    if (gained) {
      const open = await db.reminders.where('personId').equals(id).filter((r) => !r.done).count();
      if (!open) await addReminder(id, inDays(7), 'Follow up');
    }
  });
}

/** Everything deletePerson removes, so Undo can put it back exactly (open-issues step, M3-O5). */
export interface DeletedPerson {
  person: Person;
  links: Link[];
  reminders: Reminder[];
  contactLogs: ContactLog[];
}

/** Removes people and everything pointing at them. Must run inside a transaction over these tables. */
async function removePeople(ids: string[]): Promise<void> {
  await db.people.bulkDelete(ids);
  await db.links.where('fromId').anyOf(ids).or('toId').anyOf(ids).delete();
  await db.reminders.where('personId').anyOf(ids).delete();
  await db.contactLogs.where('personId').anyOf(ids).delete();
}

// Step 3. Nothing may point at a deleted person. Returns a snapshot for Undo.
export async function deletePerson(id: string): Promise<DeletedPerson | undefined> {
  return db.transaction('rw', [db.people, db.links, db.reminders, db.contactLogs], async () => {
    const person = await db.people.get(id);
    if (!person) return undefined;
    const snapshot: DeletedPerson = {
      person,
      links: await db.links.where('fromId').equals(id).or('toId').equals(id).toArray(),
      reminders: await db.reminders.where('personId').equals(id).toArray(),
      contactLogs: await db.contactLogs.where('personId').equals(id).toArray(),
    };
    await removePeople([id]);
    return snapshot;
  });
}

/** Undo for deletePerson: puts the person and everything attached back, in one transaction. */
export async function restorePerson(snapshot: DeletedPerson): Promise<void> {
  await db.transaction('rw', [db.people, db.links, db.reminders, db.contactLogs], async () => {
    await db.people.put(snapshot.person);
    // Only links whose other person still exists (they may have been deleted meanwhile).
    const others = await db.people.bulkGet(snapshot.links.map((l) => (l.fromId === snapshot.person.id ? l.toId : l.fromId)));
    await db.links.bulkPut(snapshot.links.filter((_, i) => others[i]));
    await db.reminders.bulkPut(snapshot.reminders);
    await db.contactLogs.bulkPut(snapshot.contactLogs);
  });
}

/**
 * M6. Writes accepted AI sort suggestions in ONE transaction. Keeps the user's own tags and
 * only drops the gray "LinkedIn" placeholder (the person's `source` still records it).
 */
export async function applyClassification(items: Array<{ id: string; ring: Ring; primaryTag: string; tags: string[] }>): Promise<void> {
  await db.transaction('rw', [db.people, db.tags], async () => {
    const current = await db.people.bulkGet(items.map((i) => i.id));
    const changes = items.flatMap((item, i) => {
      const before = current[i];
      if (!before) return []; // deleted while the review was open
      const kept = before.tags.filter((t) => t !== 'LinkedIn');
      return [{ key: item.id, changes: { ring: item.ring, primaryTag: item.primaryTag, tags: [...new Set([item.primaryTag, ...item.tags, ...kept])] } }];
    });
    await db.people.bulkUpdate(changes);
    await ensureTags(changes.flatMap((c) => c.changes.tags));
  });
}

// Step 4. Always both: drift (M10) reads lastContact, history reads the logs.
export async function logContact(personId: string, kind: 'meeting' | 'message' | 'other' = 'other', note?: string): Promise<void> {
  const date = today();
  await db.transaction('rw', [db.people, db.contactLogs], async () => {
    if (!(await db.people.get(personId))) return; // no orphan logs for a deleted person
    await db.contactLogs.add({ id: newId('c'), personId, date, kind, note });
    await db.people.update(personId, { lastContact: date });
  });
}

// Step 5.
export async function addReminder(personId: string, dueDate: string, note: string): Promise<Reminder> {
  const reminder: Reminder = { id: newId('r'), personId, dueDate, note: note.trim() || 'Follow up', done: false };
  await db.reminders.add(reminder);
  return reminder;
}

export async function setReminderDone(id: string, done: boolean): Promise<void> {
  await db.reminders.update(id, { done });
}

export async function snoozeReminder(id: string, days = 7): Promise<void> {
  await db.reminders.update(id, { dueDate: inDays(days) });
}

export async function deleteReminder(id: string): Promise<void> {
  await db.reminders.delete(id);
}

// Step 6. Undirected: one row per pair, smaller id first, so "does A–B exist?" is one lookup.
export function normalizeLink(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a];
}

export async function upsertLink(a: string, b: string, data: Pick<Link, 'source' | 'status'> & { label?: string }): Promise<void> {
  const [fromId, toId] = normalizeLink(a, b);
  if (fromId === toId) return;
  await db.transaction('rw', [db.people, db.links], async () => {
    const [from, to] = await db.people.bulkGet([fromId, toId]);
    if (!from || !to) return; // a stale id (e.g. from an old AI answer) must not create a dangling link
    const existing = await db.links.where('fromId').equals(fromId).filter((l) => l.toId === toId).first();
    if (!existing) {
      await db.links.add({ id: newId('l'), fromId, toId, ...data });
      return;
    }
    if (existing.status === 'accepted' && data.status === 'suggested') return; // never downgrade
    await db.links.update(existing.id, { ...data, label: data.label ?? existing.label });
  });
}

/**
 * M6. Writes AI suggestions as dashed `suggested` links in one transaction. Returns each
 * link's id and whether THIS call created it, so a dismissed review removes only its own.
 */
export async function addSuggestedLinks(
  suggestions: Array<{ fromId: string; toId: string; label: string }>,
): Promise<Array<{ id: string; fromId: string; toId: string; label: string; created: boolean }>> {
  return db.transaction('rw', [db.people, db.links], async () => {
    const out: Array<{ id: string; fromId: string; toId: string; label: string; created: boolean }> = [];
    for (const s of suggestions) {
      const [fromId, toId] = normalizeLink(s.fromId, s.toId);
      if (fromId === toId) continue;
      const [a, b] = await db.people.bulkGet([fromId, toId]);
      if (!a || !b) continue;
      const existing = await db.links.where('fromId').equals(fromId).filter((l) => l.toId === toId).first();
      if (existing?.status === 'accepted') continue; // already known: nothing to review
      if (existing) {
        await db.links.update(existing.id, { label: s.label, source: 'ai' });
        out.push({ id: existing.id, fromId, toId, label: s.label, created: false });
      } else {
        const id = newId('l');
        await db.links.add({ id, fromId, toId, label: s.label, source: 'ai', status: 'suggested' });
        out.push({ id, fromId, toId, label: s.label, created: true });
      }
    }
    return out;
  });
}

/** M6. Accepts some suggested links and removes others, in one transaction. */
export async function resolveLinks(acceptIds: string[], removeIds: string[]): Promise<void> {
  await db.transaction('rw', db.links, async () => {
    await db.links.bulkUpdate(acceptIds.map((key) => ({ key, changes: { status: 'accepted' as const } })));
    await db.links.bulkDelete(removeIds);
  });
}

export async function acceptLink(id: string): Promise<void> {
  await db.links.update(id, { status: 'accepted' });
}

export async function removeLink(id: string): Promise<void> {
  await db.links.delete(id);
}

// Step 7. One transaction: a 114-person import lands completely or not at all.
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
      ring: d.ring ?? 3, // unsorted imports start on the outer ring; M6 sorts them
      primaryTag: tags[0]!,
      tags,
      lastContact: d.lastContact ?? d.metAt, // "connected on" is the best guess we have
      source,
      createdAt,
    };
  });
  await db.transaction('rw', [db.people, db.tags], async () => {
    await db.people.bulkAdd(people);
    await db.people.bulkUpdate(plan.toUpdate.map(({ id, patch }) => ({ key: id, changes: patch })));
    await ensureTags(people.flatMap((p) => p.tags));
  });
  return people.map((p) => p.id);
}

/**
 * Undo for applyImport (open-issues step, M4-O3): removes the people it added (and anything
 * attached to them since), and clears ONLY the fields it filled, which were empty before.
 */
export async function undoImport(addedIds: string[], filled: Array<{ id: string; patch: Partial<Person> }>): Promise<void> {
  await db.transaction('rw', [db.people, db.links, db.reminders, db.contactLogs], async () => {
    await removePeople(addedIds);
    await db.people.bulkUpdate(
      filled.map(({ id, patch }) => ({ key: id, changes: Object.fromEntries(Object.keys(patch).map((k) => [k, undefined])) })),
    );
  });
}
