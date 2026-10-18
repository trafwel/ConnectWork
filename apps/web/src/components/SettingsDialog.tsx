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
 *        Import backup (open-issues step: confirm before replacing, M1-O5) → a hidden <input type="file" accept="application/json"> clicked via
 *          a ref; on change: importBackup(file), clearFocus(), toast.success; catch → toast.error.
 *          Reset the input value so the same file can be chosen twice.
 *        Reset demo data → resetDemoData(), clearFocus(), toast.
 *   4. "Danger zone": Delete everything shows an inline "Delete every person, link and
 *      reminder?" with "Yes, delete" (destructive) and Cancel. Yes → deleteEverything(),
 *      clearFocus(), close, toast.
 *   4b. (Step S) Appearance: Style (Neutral / Atlas) and Mode (System / Light / Dark), saved
 *       per device by lib/appearance.ts. Fix step 2 adds Reminders (Flag / Ripple).
 *   5. Later sections: M6 ✓ "About you" textarea saved to db.meta 'userContext' on blur;
 *      M7 ✓ "Export all reminders"; M10 ✓ drift thresholds (DriftSettings); M16 <AgentConnection />.
 *
 * DONE WHEN
 *   - Each button does what it says, and the delete needs two clicks.
 *
 * Guide: §5.5
 */

import { useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { db } from '@/db/db';
import type { Appearance } from '@/lib/appearance';
import { addToCalendar } from '@/lib/addToCalendar';
import { AgentConnection } from './AgentConnection';
import { DriftSettings } from './DriftSettings';
import { Segmented } from './Segmented';
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

interface Props {
  appearance: Appearance;
  onAppearance: (next: Partial<Appearance>) => void;
}

export function SettingsDialog({ appearance, onAppearance }: Props) {
  const open = useStore((s) => s.settingsOpen);
  const setDialog = useStore((s) => s.setDialog);
  const clearFocus = useStore((s) => s.clearFocus);
  const [confirmDelete, setConfirmDelete] = useState(false);
  /** A chosen backup waits here until the user confirms it may replace everything (M1-O5). */
  const [pendingImport, setPendingImport] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const close = () => {
    setConfirmDelete(false);
    setPendingImport(null);
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
      {/* Oct 18 (team screenshot): four styles no longer fit the default 24rem, and one wide row
          stretched the dialog's whole grid past its edge. 28rem fits them; min-w-0 lets rows
          shrink and wrap instead; the dialog scrolls on short screens. */}
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-md [&>*]:min-w-0">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>Your data lives only in this browser. Export it to keep a copy.</DialogDescription>
        </DialogHeader>

        {/* Step S */}
        <section className="space-y-2" aria-labelledby="appearance-heading">
          <h3 id="appearance-heading" className="text-sm font-medium">
            Appearance
          </h3>
          <div className="grid grid-cols-[5rem_1fr] items-center gap-x-3 gap-y-2 text-sm">
            <span>Style</span>
            <Segmented
              label="Style"
              value={appearance.style}
              onChange={(style) => onAppearance({ style })}
              options={[
                { value: 'neutral', label: 'Neutral' },
                { value: 'atlas', label: 'Atlas' },
                { value: 'spiderweb', label: 'Spiderweb' },
                { value: 'phantom', label: 'Phantom' },
                { value: 'solar', label: 'Solar' },
              ]}
            />
            <span>Mode</span>
            <Segmented
              label="Mode"
              value={appearance.mode}
              onChange={(mode) => onAppearance({ mode })}
              options={[
                { value: 'system', label: 'System' },
                { value: 'light', label: 'Light' },
                { value: 'dark', label: 'Dark' },
              ]}
            />
            <span>Reminders</span>
            <Segmented
              label="Reminder style on the map"
              value={appearance.reminders}
              onChange={(reminders) => onAppearance({ reminders })}
              options={[
                { value: 'flag', label: 'Flag' },
                { value: 'ripple', label: 'Ripple' },
              ]}
            />
            {/* Oct 18: profile pictures on the map, with the group color kept as a ring. */}
            <span>Photos</span>
            <Segmented
              label="Profile pictures on the map"
              value={appearance.photos ? 'on' : 'off'}
              onChange={(v) => onAppearance({ photos: v === 'on' })}
              options={[
                { value: 'on', label: 'On' },
                { value: 'off', label: 'Off' },
              ]}
            />
          </div>
        </section>

        <AboutYou />

        <DriftSettings />

        <AgentConnection />

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
                if (file) setPendingImport(file); // step 2 of 2 is the confirm below
              }}
            />
            <Button
              variant="outline"
              disabled={busy}
              onClick={() =>
                run(async () => {
                  // M7: every undone reminder in one calendar file.
                  const open = await db.reminders.filter((r) => !r.done).toArray();
                  const people = await db.people.bulkGet(open.map((r) => r.personId));
                  const items = open.flatMap((reminder, i) => (people[i] ? [{ reminder, person: people[i] }] : []));
                  if (!items.length) return 'No open reminders to export';
                  await addToCalendar(items, `connectwork-reminders-${today()}.ics`);
                  return `Exported ${items.length} ${items.length === 1 ? 'reminder' : 'reminders'}`;
                })
              }
            >
              Export all reminders
            </Button>
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
          {pendingImport && (
            <div className="flex flex-wrap items-center gap-2 rounded-md border p-2 text-sm" role="group" aria-label="Confirm import">
              <span className="min-w-0 flex-1">
                Replace all your data with{' '}
                <span className="inline-block max-w-full truncate align-bottom font-medium" title={pendingImport.name}>
                  {pendingImport.name}
                </span>
                ?
              </span>
              <Button
                size="sm"
                disabled={busy}
                onClick={() =>
                  run(async () => {
                    await importBackup(pendingImport);
                    setPendingImport(null);
                    clearFocus();
                    return 'Backup restored';
                  })
                }
              >
                Replace
              </Button>
              <Button size="sm" variant="ghost" disabled={busy} onClick={() => setPendingImport(null)}>
                Cancel
              </Button>
            </div>
          )}
          <p className="text-xs text-muted-foreground">The backup file is not encrypted. Keep it somewhere private.</p>
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

/**
 * M6. A line about the user ("UW CS junior, interning at Amazon") that Sort with AI uses to spot
 * people from the same school or company. Draft only while typing, saved on blur (like the card).
 */
function AboutYou() {
  const stored = useLiveQuery(async () => {
    const v = (await db.meta.get('userContext'))?.value;
    return typeof v === 'string' ? v : '';
  }, []);
  const [draft, setDraft] = useState<string | null>(null);
  return (
    <section className="space-y-1.5">
      <Label htmlFor="settings-about" className="text-sm font-medium">
        About you
      </Label>
      <Textarea
        id="settings-about"
        rows={2}
        maxLength={500}
        placeholder="e.g. UW CS junior, interning at Amazon"
        value={draft ?? stored ?? ''}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          if (draft !== null && draft !== stored) void db.meta.put({ key: 'userContext', value: draft.trim() });
          setDraft(null);
        }}
      />
      <p className="text-xs text-muted-foreground">Sent with &ldquo;Sort with AI&rdquo; so it can spot people from your school or company.</p>
    </section>
  );
}
