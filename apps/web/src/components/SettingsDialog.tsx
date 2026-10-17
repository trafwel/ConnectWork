/**
 * M1 — Settings: your data · done for M1 (more settings in M6, M7, M10, M16)
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

import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { deleteEverything, exportAll, importBackup, resetDemoData } from '@/db/seed';
import { today } from '@/lib/dates';
import { useStore } from '@/store/useStore';

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  // Revoking in the same tick can cancel the download in some browsers.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

export function SettingsDialog() {
  const open = useStore((s) => s.settingsOpen);
  const setDialog = useStore((s) => s.setDialog);
  const clearFocus = useStore((s) => s.clearFocus);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const close = () => {
    setConfirmDelete(false);
    setDialog('settings', false);
  };

  /** Runs one data action at a time: buttons disable while it runs, and errors become a toast. */
  const run = async (action: () => Promise<string>) => {
    setBusy(true);
    try {
      toast.success(await action());
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? setDialog('settings', true) : close())}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>Your data lives only in this browser. Export it to keep a copy.</DialogDescription>
        </DialogHeader>

        <section className="space-y-2">
          <h3 className="text-sm font-medium">Your data</h3>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              disabled={busy}
              onClick={() =>
                run(async () => {
                  download(await exportAll(), `connectwork-backup-${today()}.json`);
                  return 'Backup downloaded';
                })
              }
            >
              Export backup
            </Button>
            <Button variant="outline" disabled={busy} onClick={() => fileRef.current?.click()}>
              Import backup
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = ''; // so choosing the same file again still fires onChange
                if (!file) return;
                void run(async () => {
                  await importBackup(file);
                  clearFocus();
                  return 'Backup restored';
                });
              }}
            />
            <Button
              variant="outline"
              disabled={busy}
              onClick={() =>
                run(async () => {
                  await resetDemoData();
                  clearFocus();
                  return 'Demo data restored';
                })
              }
            >
              Reset demo data
            </Button>
          </div>
        </section>

        <section className="space-y-2">
          <h3 className="text-sm font-medium">Danger zone</h3>
          {confirmDelete ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm">Delete every person, link and reminder?</span>
              <Button
                variant="destructive"
                disabled={busy}
                onClick={() =>
                  run(async () => {
                    await deleteEverything();
                    clearFocus();
                    close();
                    return 'Everything deleted';
                  })
                }
              >
                Yes, delete
              </Button>
              <Button variant="ghost" disabled={busy} onClick={() => setConfirmDelete(false)}>
                Cancel
              </Button>
            </div>
          ) : (
            <Button variant="destructive" disabled={busy} onClick={() => setConfirmDelete(true)}>
              Delete everything
            </Button>
          )}
        </section>
      </DialogContent>
    </Dialog>
  );
}
