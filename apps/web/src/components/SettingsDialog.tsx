/**
 * M1 — Settings: your data · Owner: Person A · ~40 min (more settings in M6, M7, M10, M16)
 *
 * WHAT THIS ACHIEVES
 *   Users stay in control of their data: export a backup, import one, reset the
 *   demo, or delete everything (two-step confirm). It makes the privacy promise
 *   concrete in the UI.
 *
 * HOW IT FITS
 *   Opened from the TopBar gear (store.settingsOpen). Calls db/seed.ts functions.
 *
 * STEPS
 *   1. Controlled shadcn Dialog: open={settingsOpen}; onOpenChange closes it and resets
 *      the delete confirmation.
 *   2. Header: "Settings" + "Your data lives only in this browser. Export it to keep a copy."
 *   3. "Your data" section:
 *        Export backup → download(await exportAll(), 'connectwork-backup.json') using a
 *          temporary <a download> and URL.createObjectURL (revoke it after).
 *        Import backup → a hidden <input type="file" accept="application/json"> clicked via
 *          a ref; on change: importBackup(file), clearFocus(), toast.success; catch → toast.error.
 *          Reset the input value so the same file can be chosen twice.
 *        Reset demo data → resetDemoData(), clearFocus(), toast.
 *   4. "Danger zone": Delete everything shows an inline "Delete every person, link and
 *      reminder?" with "Yes, delete" (destructive) and Cancel. Yes → deleteEverything(),
 *      clearFocus(), close, toast.
 *   5. Later sections: M6 "About you" textarea saved to db.meta 'userContext' on blur;
 *      M7 "Export all reminders"; M10 drift thresholds; M16 <AgentConnection />.
 *
 * DONE WHEN
 *   - Each button does what it says, and the delete needs two clicks.
 *
 * Guide: §5.5
 */

export function SettingsDialog() {
  // TODO(M1) steps 1–4
  return null;
}
