/**
 * M1 — Seeding, reset, delete, export, import · done (step 9 is theme step T)
 *
 * WHAT THIS ACHIEVES
 *   First load shows a full demo network; Settings can reset it, wipe everything,
 *   or back it up to a JSON file and restore it — the user stays in control of
 *   their data.
 *
 * HOW IT FITS
 *   App.tsx calls ensureSeeded() on mount; SettingsDialog calls the rest.
 *   Default tags come from lib/colors.ts; offsets → dates from db/materialize.ts.
 *
 * STEPS
 *   1. Load demo/seed.json with a dynamic import() so it is a separate chunk, fetched
 *      only on a first visit or a reset (Vite bundles JSON).
 *   2. writeSeed(): ONE transaction over people, links, reminders, tags, meta:
 *        bulkPut DEFAULT_TAGS, the materialized people/links/reminders, then
 *        meta.put({ key: 'seeded', value: true }).
 *   3. ensureSeeded(): if meta 'seeded' exists → return; else writeSeed().
 *      MEMOIZE the promise in a module variable (`seeding ??= (async () => …)()`):
 *      React StrictMode runs effects twice in development and would seed twice.
 *   4. clearAll(): one transaction over every table in TABLES, clear each.
 *   5. resetDemoData(): read the user's settings first (meta keys 'userContext',
 *      'driftThresholds', 'relayToken'), clearAll(), writeSeed(), put the settings back.
 *   6. deleteEverything(): clearAll(), re-add DEFAULT_TAGS, and KEEP meta 'seeded' = true
 *      so the demo doesn't come back on reload.
 *   7. exportAll() (open-issues step: settings only, never secrets like relayToken): read every table into { app: 'connectwork', version: 1,
 *      exportedAt, data: { tableName: rows } } and return it as a JSON Blob.
 *   8. importBackup(file): JSON.parse(await file.text()); refuse unless app === 'connectwork'
 *      and data exists; validate EVERY row with the stored-row zod schemas (open-issues step,
 *      M1-S2); clearAll(); bulkPut each table's rows in one transaction.
 *   9. (Theme step T) syncDefaultTagColors(): when a theme changes DEFAULT_TAGS, browsers
 *      that seeded earlier keep old colors. On startup, for each default tag name whose
 *      color/behavior differs, put the new one. Never touch custom tags.
 *
 * DONE WHEN
 *   - 30 people on first load; reload keeps them; Delete everything → 0 after reload;
 *     Reset demo data → 30 again, with "About you" kept; export → import round-trips.
 *
 * Guide: §5.3
 */
import type { Table } from 'dexie';
import { BACKUP_META_KEYS, STORED_ROW_SCHEMAS } from '@connectwork/shared';
import { DEFAULT_TAGS } from '@/lib/colors';
import { db, TABLES } from './db';
import { materializeSeed } from './materialize';

/** Meta keys that are the user's settings, not data: kept across "Reset demo data". */
const SETTING_KEYS = ['userContext', 'driftThresholds', 'relayToken'] as const;

const allTables = () => TABLES.map((t) => db[t]);

/** Largest backup we will read; file.text() on a huge file would freeze the tab. */
const MAX_BACKUP_BYTES = 20 * 1024 * 1024;

type Demo = ReturnType<typeof materializeSeed>;

// Step 1. Loaded on demand so returning visitors don't download the demo with the app.
// Call it BEFORE opening a transaction: awaiting a non-Dexie promise inside one commits it early.
async function loadDemo(): Promise<Demo> {
  const { default: seed } = await import('../../../../demo/seed.json');
  return materializeSeed(seed);
}

/** Writes the demo rows. Must run inside a transaction that covers these tables. */
async function putSeed({ people, links, reminders }: Demo): Promise<void> {
  await db.tags.bulkPut(DEFAULT_TAGS);
  await db.people.bulkPut(people);
  await db.links.bulkPut(links);
  await db.reminders.bulkPut(reminders);
  await db.meta.put({ key: 'seeded', value: true });
}

// Step 2. One transaction: either the whole demo is written, or nothing is.
async function writeSeed(): Promise<void> {
  const demo = await loadDemo();
  await db.transaction('rw', [db.people, db.links, db.reminders, db.tags, db.meta], () => putSeed(demo));
}

// Step 3. Memoized: StrictMode runs effects twice in dev; both calls share one promise.
let seeding: Promise<void> | null = null;

/** Seeds the demo once per browser. Safe to call any number of times. */
export function ensureSeeded(): Promise<void> {
  seeding ??= (async () => {
    if (await db.meta.get('seeded')) return;
    await writeSeed();
  })().catch((err: unknown) => {
    seeding = null; // remember success, not failure: the next call tries again
    throw err;
  });
  return seeding;
}

// Step 4. Not wrapped in its own transaction on purpose: Dexie joins the caller's
// transaction when there is one, so callers can clear + write atomically.
export async function clearAll(): Promise<void> {
  await db.transaction('rw', allTables(), async () => {
    await Promise.all(TABLES.map((t) => db[t].clear()));
  });
}

// Step 5. Read settings, clear, reseed and restore them, all in one transaction.
export async function resetDemoData(): Promise<void> {
  const demo = await loadDemo();
  await db.transaction('rw', allTables(), async () => {
    const settings = (await db.meta.bulkGet([...SETTING_KEYS])).filter((row) => row !== undefined);
    await clearAll();
    await putSeed(demo);
    await db.meta.bulkPut(settings);
  });
}

// Step 6. Keep 'seeded' so the demo does not come back on the next reload.
export async function deleteEverything(): Promise<void> {
  await db.transaction('rw', allTables(), async () => {
    await clearAll();
    await db.tags.bulkPut(DEFAULT_TAGS);
    await db.meta.put({ key: 'seeded', value: true });
  });
}

// Step 7.
export async function exportAll(): Promise<Blob> {
  const data: Record<string, unknown[]> = {};
  await db.transaction('r', allTables(), async () => {
    for (const t of TABLES) data[t] = await db[t].toArray();
    // Backups get emailed and synced; secrets (e.g. the M16 relay token) never go in them.
    data.meta = (data.meta as Array<{ key: string }>).filter((row) => backupMetaKeys.has(row.key));
  });
  const backup = { app: 'connectwork', version: 1, exportedAt: new Date().toISOString(), data };
  return new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
}

const backupMetaKeys = new Set<string>(BACKUP_META_KEYS);

/**
 * Validates every row of one table with its zod schema (packages/shared/src/storedRows.ts).
 * Returns the cleaned rows (unknown fields stripped, unsafe links dropped) or throws a
 * message that names the table, row and field.
 */
function checkRows(table: (typeof TABLES)[number], rows: unknown): object[] {
  if (rows === undefined) return [];
  if (!Array.isArray(rows)) throw new Error(`Backup table "${table}" is not a list`);
  // Settings that never travel in backups (e.g. a relay token from an older file) are ignored.
  const input = table === 'meta' ? rows.filter((r) => backupMetaKeys.has((r as { key?: string } | null)?.key ?? '')) : rows;
  return input.map((row, i) => {
    const result = STORED_ROW_SCHEMAS[table].safeParse(row);
    if (result.success) return result.data;
    const issue = result.error.issues[0];
    throw new Error(`Backup table "${table}", row ${i + 1}: ${issue?.path.join('.') || 'row'} is not valid`);
  });
}

// Step 8. Validate EVERYTHING before touching the database, then clear + write in one
// transaction: a bad file leaves the current data exactly as it was.
export async function importBackup(file: File): Promise<void> {
  if (file.size > MAX_BACKUP_BYTES) throw new Error('That file is too large to be a Connectwork backup');
  let parsed: unknown;
  try {
    parsed = JSON.parse(await file.text());
  } catch {
    throw new Error('That file is not valid JSON');
  }
  const backup = parsed as { app?: unknown; version?: unknown; data?: unknown };
  if (backup?.app !== 'connectwork' || typeof backup.data !== 'object' || backup.data === null) {
    throw new Error('Not a Connectwork backup file');
  }
  if (backup.version !== 1) throw new Error('Unsupported backup version');
  const data = backup.data as Record<string, unknown>;
  const rowsByTable = TABLES.map((t) => [t, checkRows(t, data[t])] as const);

  await db.transaction('rw', allTables(), async () => {
    await clearAll();
    for (const [t, rows] of rowsByTable) await (db[t] as Table<object, string>).bulkPut(rows);
  });
}
