// Must be the first import: installs an in-memory IndexedDB as a global before Dexie loads,
// so db.ts and actions.ts run unchanged in Node.
import 'fake-indexeddb/auto';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_TAGS, FALLBACK_COLOR } from '@/lib/colors';
import {
  acceptLink,
  addPerson,
  addReminder,
  deletePerson,
  deleteReminder,
  logContact,
  normalizeLink,
  removeLink,
  setReminderDone,
  snoozeReminder,
  updatePerson,
  upsertLink,
} from './actions';
import { db, TABLES } from './db';

// Only Date is faked: fake-indexeddb needs real timers to run its callbacks.
vi.useFakeTimers({ toFake: ['Date'] });
vi.setSystemTime(new Date(2026, 9, 17, 12)); // Oct 17 2026, local noon

beforeEach(async () => {
  await db.transaction('rw', TABLES.map((t) => db[t]), async () => {
    await Promise.all(TABLES.map((t) => db[t].clear()));
    await db.tags.bulkPut(DEFAULT_TAGS);
  });
});

afterAll(() => {
  vi.useRealTimers();
});

const person = (name: string, extra: Partial<Parameters<typeof addPerson>[0]> = {}) => addPerson({ name, ring: 2, primaryTag: 'Work', ...extra });

describe('normalizeLink', () => {
  it('stores each pair once, smaller id first', () => {
    expect(normalizeLink('p_b', 'p_a')).toEqual(['p_a', 'p_b']);
    expect(normalizeLink('p_a', 'p_b')).toEqual(normalizeLink('p_b', 'p_a'));
  });
});

describe('addPerson', () => {
  it('fills defaults and lets callers override them, but not id rules or createdAt', async () => {
    const p = await person('  Jordan Lee  ', { source: 'snap' });
    expect(p).toMatchObject({ name: 'Jordan Lee', tags: ['Work'], source: 'snap', lastContact: '2026-10-17' });
    expect(p.id).toMatch(/^p_/);
    expect(await db.people.get(p.id)).toEqual(p);
  });

  it('refuses a blank name', async () => {
    await expect(person('   ')).rejects.toThrow('A name is required');
    expect(await db.people.count()).toBe(0);
  });

  it('keeps the primary tag in tags and creates unknown tags', async () => {
    const p = await person('A', { primaryTag: 'Chess club', tags: ['Climbing'] });
    expect(p.tags).toEqual(['Chess club', 'Climbing']);
    expect(await db.tags.get('Chess club')).toEqual({ name: 'Chess club', color: FALLBACK_COLOR, behavior: 'none' });
    expect(await db.tags.get('Climbing')).toBeDefined();
  });
});

describe('updatePerson', () => {
  it('merges the patch and ignores unknown ids', async () => {
    const p = await person('A');
    await updatePerson(p.id, { company: 'Microsoft', ring: 1 });
    expect(await db.people.get(p.id)).toMatchObject({ name: 'A', company: 'Microsoft', ring: 1 });
    await expect(updatePerson('p_missing', { ring: 1 })).resolves.toBeUndefined();
  });

  it('keeps the old name when the new one is blank', async () => {
    const p = await person('Abbey Chen');
    await updatePerson(p.id, { name: '   ' });
    expect((await db.people.get(p.id))?.name).toBe('Abbey Chen');
  });

  it('keeps the primary tag in tags, even if a patch drops it', async () => {
    const p = await person('A', { tags: ['Work', 'Clubs'] });
    await updatePerson(p.id, { primaryTag: 'Family' });
    expect((await db.people.get(p.id))?.tags).toEqual(['Family', 'Work', 'Clubs']);
    await updatePerson(p.id, { tags: ['Clubs'] });
    expect((await db.people.get(p.id))?.tags).toEqual(['Family', 'Clubs']);
  });

  it('gaining the follow-up tag schedules ONE reminder in 7 days', async () => {
    const p = await person('A');
    await updatePerson(p.id, { tags: ['Work', 'follow-up'] });
    const reminders = await db.reminders.where('personId').equals(p.id).toArray();
    expect(reminders).toEqual([expect.objectContaining({ dueDate: '2026-10-24', note: 'Follow up', done: false })]);

    // Removing and re-adding while a reminder is still open: no duplicate.
    await updatePerson(p.id, { tags: ['Work'] });
    await updatePerson(p.id, { tags: ['Work', 'follow-up'] });
    expect(await db.reminders.where('personId').equals(p.id).count()).toBe(1);
  });

  it('does not schedule a reminder when the tag was already there', async () => {
    const p = await person('A', { tags: ['Work', 'follow-up'] });
    await updatePerson(p.id, { notes: 'hi' });
    expect(await db.reminders.count()).toBe(0);
  });

  it('is all-or-nothing: if the reminder write fails, the person edit is rolled back', async () => {
    const p = await person('A');
    const spy = vi.spyOn(db.reminders, 'add').mockImplementationOnce(() => {
      throw new Error('disk full');
    });
    await expect(updatePerson(p.id, { company: 'Microsoft', tags: ['Work', 'follow-up'] })).rejects.toThrow('disk full');
    spy.mockRestore();
    const after = await db.people.get(p.id);
    expect(after?.company).toBeUndefined();
    expect(after?.tags).toEqual(['Work']);
  });
});

describe('deletePerson', () => {
  it('removes the person and everything pointing at them, and nothing else', async () => {
    const a = await person('A');
    const b = await person('B');
    const c = await person('C');
    await upsertLink(a.id, b.id, { source: 'user', status: 'accepted' });
    await upsertLink(c.id, a.id, { source: 'user', status: 'accepted' }); // a is toId or fromId depending on ids
    await upsertLink(b.id, c.id, { source: 'user', status: 'accepted' });
    await addReminder(a.id, '2026-10-20', 'x');
    await addReminder(b.id, '2026-10-20', 'y');
    await logContact(a.id);

    await deletePerson(a.id);

    expect(await db.people.get(a.id)).toBeUndefined();
    expect(await db.links.count()).toBe(1); // only b–c is left
    expect(await db.reminders.where('personId').equals(a.id).count()).toBe(0);
    expect(await db.reminders.count()).toBe(1);
    expect(await db.contactLogs.count()).toBe(0);
  });
});

describe('logContact', () => {
  it('writes a history row AND updates lastContact', async () => {
    const p = await person('A', { lastContact: '2026-01-01' });
    await logContact(p.id, 'meeting', 'Coffee');
    expect((await db.people.get(p.id))?.lastContact).toBe('2026-10-17');
    expect(await db.contactLogs.toArray()).toEqual([expect.objectContaining({ personId: p.id, date: '2026-10-17', kind: 'meeting', note: 'Coffee' })]);
  });

  it('does nothing for a missing person (no orphan logs)', async () => {
    await logContact('p_missing');
    expect(await db.contactLogs.count()).toBe(0);
  });
});

describe('reminders', () => {
  it('adds with a default note, completes, snoozes and deletes', async () => {
    const p = await person('A');
    const r = await addReminder(p.id, '2026-10-10', '   ');
    expect(r.note).toBe('Follow up');

    await setReminderDone(r.id, true);
    expect((await db.reminders.get(r.id))?.done).toBe(true);

    await snoozeReminder(r.id, 3);
    expect((await db.reminders.get(r.id))?.dueDate).toBe('2026-10-20');

    await deleteReminder(r.id);
    expect(await db.reminders.count()).toBe(0);
  });
});

describe('upsertLink', () => {
  it('stores a pair once in normalized order, whichever way round it is given', async () => {
    const a = await person('A');
    const b = await person('B');
    await upsertLink(b.id, a.id, { source: 'user', status: 'accepted' });
    await upsertLink(a.id, b.id, { source: 'user', status: 'accepted', label: 'lab partners' });
    const links = await db.links.toArray();
    expect(links).toHaveLength(1);
    expect([links[0]!.fromId, links[0]!.toId]).toEqual(normalizeLink(a.id, b.id));
    expect(links[0]!.label).toBe('lab partners');
  });

  it('refuses self-links and links to people who do not exist', async () => {
    const a = await person('A');
    await upsertLink(a.id, a.id, { source: 'user', status: 'accepted' });
    await upsertLink(a.id, 'p_missing', { source: 'ai', status: 'suggested' });
    expect(await db.links.count()).toBe(0);
  });

  it('never downgrades an accepted link, but upgrades a suggested one', async () => {
    const a = await person('A');
    const b = await person('B');
    await upsertLink(a.id, b.id, { source: 'user', status: 'accepted', label: 'mine' });
    await upsertLink(a.id, b.id, { source: 'ai', status: 'suggested', label: 'AI guess' });
    expect(await db.links.toArray()).toEqual([expect.objectContaining({ status: 'accepted', source: 'user', label: 'mine' })]);

    const c = await person('C');
    await upsertLink(a.id, c.id, { source: 'ai', status: 'suggested', label: 'both at Microsoft' });
    await upsertLink(c.id, a.id, { source: 'user', status: 'accepted' });
    const ac = await db.links.where('fromId').anyOf(a.id, c.id).filter((l) => [l.fromId, l.toId].includes(c.id)).first();
    expect(ac).toMatchObject({ status: 'accepted', label: 'both at Microsoft' }); // label kept when none given
  });

  it('acceptLink and removeLink act on one link', async () => {
    const a = await person('A');
    const b = await person('B');
    await upsertLink(a.id, b.id, { source: 'ai', status: 'suggested' });
    const link = (await db.links.toArray())[0]!;
    await acceptLink(link.id);
    expect((await db.links.get(link.id))?.status).toBe('accepted');
    await removeLink(link.id);
    expect(await db.links.count()).toBe(0);
  });
});
