// Must be the first import: in-memory IndexedDB for Dexie (see actions.test.ts).
import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from './db';
import { exportAll, importBackup, resetDemoData } from './seed';

const fileOf = (data: unknown) => new File([JSON.stringify(data)], 'backup.json', { type: 'application/json' });
const backupOf = async () => JSON.parse(await (await exportAll()).text()) as { app: string; version: number; data: Record<string, Array<Record<string, unknown>>> };

beforeEach(async () => {
  await resetDemoData();
  await db.meta.put({ key: 'userContext', value: 'CS student at UW' });
  await db.meta.put({ key: 'relayToken', value: 'secret-token' });
});

describe('backups', () => {
  it('round-trips every table, and never exports secrets', async () => {
    const backup = await backupOf();
    expect(backup.data.people).toHaveLength(40);
    expect(backup.data.meta!.map((m) => m.key).sort()).toEqual(['seeded', 'userContext']);

    await db.people.clear();
    await importBackup(fileOf(backup));
    expect(await db.people.count()).toBe(40);
    const again = await backupOf();
    expect(again.data).toEqual(backup.data);
  });

  it('refuses a tampered row and leaves the current data exactly as it was', async () => {
    const backup = await backupOf();
    backup.data.people![3]!.ring = 99;
    await db.people.update(backup.data.people![0]!.id as string, { notes: 'current data' });
    await expect(importBackup(fileOf(backup))).rejects.toThrow('Backup table "people", row 4: ring is not valid');
    expect(await db.people.count()).toBe(40);
    expect((await db.people.get(backup.data.people![0]!.id as string))?.notes).toBe('current data');
  });

  it('refuses rows missing required fields or with oversized text', async () => {
    const missing = await backupOf();
    delete missing.data.reminders![0]!.dueDate;
    await expect(importBackup(fileOf(missing))).rejects.toThrow('"reminders", row 1: dueDate');

    const huge = await backupOf();
    huge.data.people![0]!.notes = 'x'.repeat(5001);
    await expect(importBackup(fileOf(huge))).rejects.toThrow('notes is not valid');
  });

  it('cleans what is merely unsafe: javascript: links dropped, unknown fields stripped, tokens ignored', async () => {
    const backup = await backupOf();
    const first = backup.data.people![0]!;
    first.linkedinUrl = 'javascript:alert(1)';
    first.isAdmin = true;
    backup.data.meta!.push({ key: 'relayToken', value: 'someone-elses-token' });
    await importBackup(fileOf(backup));
    const stored = await db.people.get(first.id as string);
    expect(stored?.linkedinUrl).toBeUndefined();
    expect(stored).not.toHaveProperty('isAdmin');
    expect(await db.meta.get('relayToken')).toBeUndefined();
  });

  it('keeps ordinary links typed without a scheme', async () => {
    const backup = await backupOf();
    backup.data.people![0]!.linkedinUrl = 'linkedin.com/in/someone';
    await importBackup(fileOf(backup));
    expect((await db.people.get(backup.data.people![0]!.id as string))?.linkedinUrl).toBe('linkedin.com/in/someone');
  });
});
