/**
 * M1 — Seeding, reset, delete, export, import · done
 *
 * WHAT THIS ACHIEVES
 *   First load shows a full demo network; Settings can reset it, wipe everything,
 *   or back it up to a JSON file and restore it.
 *
 * HOW IT FITS
 *   App.tsx calls ensureSeeded() on mount; SettingsDialog calls the rest.
 *
 * HOW IT WAS BUILT
 *   1. ensureSeeded(): if meta.seeded is missing, write default tags + seed in one
 *      transaction and set meta.seeded. The promise is memoized because React
 *      StrictMode runs effects twice in development.
 *   2. resetDemoData(): clear every table and seed again, keeping the user's settings
 *     (About you, drift thresholds, relay token).
 *   3. deleteEverything(): clear, re-add default tags, and KEEP meta.seeded so the
 *      demo doesn't come back on reload.
 *   4. exportAll() / importBackup(): { app: 'connectwork', version: 1, data } with an
 *      app check before replacing anything.
 *
 * DONE WHEN
 *   - 40 people on first load; reload keeps them; Delete → 0 after reload; Reset → 40.
 *
 * Guide: §5.3
 */
import seed from '../../../../demo/seed.json';
import { DEFAULT_TAGS } from '@/lib/colors';
import { materializeSeed } from './materialize';
import type { Table } from 'dexie';
import { db, TABLES } from './db';

/**
 * Theme changes update DEFAULT_TAGS, but browsers that seeded earlier keep the
 * old colors in IndexedDB. Refresh color and behavior for the default tag names
 * only; custom tags the user created are left alone.
 */
async function syncDefaultTagColors() {
  await db.transaction('rw', db.tags, async () => {
    for (const tag of DEFAULT_TAGS) {
      const current = await db.tags.get(tag.name);
      if (!current || current.color !== tag.color || current.behavior !== tag.behavior) await db.tags.put(tag);
    }
  });
}

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
    if (await db.meta.get('seeded')) {
      await syncDefaultTagColors();
      return;
    }
    await writeSeed();
  })();
  return seeding;
}

export async function clearAll() {
  await db.transaction('rw', TABLES.map((t) => db[t]), async () => {
    await Promise.all(TABLES.map((t) => db[t].clear()));
  });
}

/** Settings the user typed (not demo data); Reset demo data keeps them, Delete everything doesn't. */
const SETTING_KEYS = ['userContext', 'driftThresholds', 'relayToken'];

export async function resetDemoData() {
  const settings = (await db.meta.bulkGet(SETTING_KEYS)).filter((row): row is { key: string; value: unknown } => Boolean(row));
  await clearAll();
  await writeSeed();
  if (settings.length) await db.meta.bulkPut(settings);
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
