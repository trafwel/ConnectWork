/**
 * M3 — Every write to the database · Owner: Person B · ~1 h (applyImport in M4)
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
 * Guide: §7.1
 */
import type { Link, Person, Reminder, Ring } from '@connectwork/shared';

export async function addPerson(_input: { name: string; ring: Ring; primaryTag: string } & Partial<Person>): Promise<Person> {
  // TODO(M3) step 1
  throw new Error('TODO(M3): addPerson is not implemented yet');
}

export async function updatePerson(_id: string, _patch: Partial<Omit<Person, 'id'>>): Promise<void> {
  // TODO(M3) step 2
}

export async function deletePerson(_id: string): Promise<void> {
  // TODO(M3) step 3
}

export async function logContact(_personId: string, _kind: 'meeting' | 'message' | 'other' = 'other', _note?: string): Promise<void> {
  // TODO(M3) step 4
}

export async function addReminder(_personId: string, _dueDate: string, _note: string): Promise<Reminder> {
  // TODO(M3) step 5
  throw new Error('TODO(M3): addReminder is not implemented yet');
}

export async function setReminderDone(_id: string, _done: boolean): Promise<void> {
  // TODO(M3) step 5
}

export async function snoozeReminder(_id: string, _days = 7): Promise<void> {
  // TODO(M3) step 5
}

export async function deleteReminder(_id: string): Promise<void> {
  // TODO(M3) step 5
}

export function normalizeLink(a: string, b: string): [string, string] {
  // TODO(M3) step 6
  return [a, b];
}

export async function upsertLink(_a: string, _b: string, _data: Pick<Link, 'source' | 'status'> & { label?: string }): Promise<void> {
  // TODO(M3) step 6
}

export async function acceptLink(_id: string): Promise<void> {
  // TODO(M3) step 6
}

export async function removeLink(_id: string): Promise<void> {
  // TODO(M3) step 6
}

export async function applyImport(
  _plan: { toAdd: Array<Partial<Person> & { name: string }>; toUpdate: Array<{ id: string; patch: Partial<Person> }> },
  _source: Person['source'],
  _defaultTag: string,
): Promise<string[]> {
  // TODO(M4) step 7
  return [];
}
