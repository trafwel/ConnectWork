import seed from '../../../../demo/seed.json';
import { DEFAULT_TAGS } from '@/lib/colors';
import { materializeSeed } from './materialize';
import type { Table } from 'dexie';
import { db, TABLES } from './db';

async function writeSeed() {
  const { people, links, reminders } = materializeSeed(seed);
  await db.transaction('rw', [db.people, db.links, db.reminders, db.tags, db.meta], async () => {
    await db.tags.bulkPut(DEFAULT_TAGS);
    await db.people.bulkPut(people);
    await db.links.bulkPut(links);
    await db.reminders.bulkPut(reminders);
    await db.meta.put({ key: 'seeded', value: true });
  });
}

let seeding: Promise<void> | null = null;

/** Seeds demo data once per browser. Safe to call repeatedly. */
export function ensureSeeded(): Promise<void> {
  seeding ??= (async () => {
    if (await db.meta.get('seeded')) return;
    await writeSeed();
  })();
  return seeding;
}

export async function clearAll() {
  await db.transaction('rw', TABLES.map((t) => db[t]), async () => {
    await Promise.all(TABLES.map((t) => db[t].clear()));
  });
}

export async function resetDemoData() {
  await clearAll();
  await writeSeed();
}

/** Deletes everything and marks the db so the demo is not re-seeded. */
export async function deleteEverything() {
  await clearAll();
  await db.tags.bulkPut(DEFAULT_TAGS);
  await db.meta.put({ key: 'seeded', value: true });
}

export async function exportAll(): Promise<Blob> {
  const dump: Record<string, unknown[]> = {};
  for (const t of TABLES) dump[t] = await db[t].toArray();
  return new Blob([JSON.stringify({ app: 'connectwork', version: 1, exportedAt: new Date().toISOString(), data: dump }, null, 2)], {
    type: 'application/json',
  });
}

export async function importBackup(file: File) {
  const parsed = JSON.parse(await file.text()) as { app?: string; data?: Record<string, unknown[]> };
  if (parsed.app !== 'connectwork' || !parsed.data) throw new Error('Not a Connectwork backup file');
  await clearAll();
  await db.transaction('rw', TABLES.map((t) => db[t]), async () => {
    for (const t of TABLES) {
      const rows = parsed.data![t];
      if (Array.isArray(rows)) await (db[t] as Table).bulkPut(rows);
    }
  });
}
