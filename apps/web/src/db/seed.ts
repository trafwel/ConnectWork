/**
 * M1 — Seeding, reset, delete, export, import · Owner: Person B · ~40 min
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
 *   1. import seed from '../../../../demo/seed.json' (Vite bundles JSON).
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
 *   7. exportAll(): read every table into { app: 'connectwork', version: 1,
 *      exportedAt, data: { tableName: rows } } and return it as a JSON Blob.
 *   8. importBackup(file): JSON.parse(await file.text()); refuse unless app === 'connectwork'
 *      and data exists; clearAll(); bulkPut each table's rows in one transaction.
 *   9. (Theme step T) syncDefaultTagColors(): when a theme changes DEFAULT_TAGS, browsers
 *      that seeded earlier keep old colors. On startup, for each default tag name whose
 *      color/behavior differs, put the new one. Never touch custom tags.
 *
 * DONE WHEN
 *   - 40 people on first load; reload keeps them; Delete everything → 0 after reload;
 *     Reset demo data → 40 again, with "About you" kept; export → import round-trips.
 *
 * Guide: §5.3
 */

export async function ensureSeeded(): Promise<void> {
  // TODO(M1) steps 1–3
}

export async function clearAll(): Promise<void> {
  // TODO(M1) step 4
}

export async function resetDemoData(): Promise<void> {
  // TODO(M1) step 5
}

export async function deleteEverything(): Promise<void> {
  // TODO(M1) step 6
}

export async function exportAll(): Promise<Blob> {
  // TODO(M1) step 7
  throw new Error('TODO(M1): exportAll is not implemented yet');
}

export async function importBackup(_file: File): Promise<void> {
  // TODO(M1) step 8
  throw new Error('TODO(M1): importBackup is not implemented yet');
}
