/**
 * M1 — Settings: your data · done (more settings arrive in M6, M7, M10)
 *
 * WHAT THIS ACHIEVES
 *   Users stay in control of their data: export a backup, import one, reset the
 *   demo, or delete everything (two-step confirm). It makes the privacy story
 *   concrete in the UI.
 *
 * HOW IT FITS
 *   Calls db/seed.ts. Later: "About you" text for auto-sort (M6), "Export all
 *   reminders" (M7), drift thresholds (M10).
 *
 * DONE WHEN
 *   - Delete everything → reload shows an empty map; Reset demo data restores 40 people.
 *
 * Guide: §5.5
 */
import { useEffect, useRef, useState } from 'react';
import { db } from '@/db/db';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { deleteEverything, exportAll, importBackup, resetDemoData } from '@/db/seed';
import { useStore } from '@/store/useStore';

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function SettingsDialog() {
  const open = useStore((s) => s.settingsOpen);
  const setDialog = useStore((s) => s.setDialog);
  const clearFocus = useStore((s) => s.clearFocus);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const close = () => {
    setConfirmDelete(false);
    setDialog('settings', false);
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
            <Button variant="outline" onClick={async () => download(await exportAll(), 'connectwork-backup.json')}>
              Export backup
            </Button>
            <Button variant="outline" onClick={() => fileRef.current?.click()}>
              Import backup
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                e.target.value = '';
                if (!file) return;
                try {
                  await importBackup(file);
                  clearFocus();
                  toast.success('Backup restored');
                } catch (err) {
                  toast.error((err as Error).message);
                }
              }}
            />
            <Button
              variant="outline"
              onClick={async () => {
                await resetDemoData();
                clearFocus();
                toast.success('Demo data restored');
              }}
            >
              Reset demo data
            </Button>
          </div>
        </section>

        <AboutYou />

        <section className="space-y-2">
          <h3 className="text-sm font-medium">Danger zone</h3>
          {confirmDelete ? (
            <div className="flex items-center gap-2">
              <span className="text-sm">Delete every person, link and reminder?</span>
              <Button
                variant="destructive"
                onClick={async () => {
                  await deleteEverything();
                  clearFocus();
                  close();
                  toast.success('Everything deleted');
                }}
              >
                Yes, delete
              </Button>
              <Button variant="ghost" onClick={() => setConfirmDelete(false)}>
                Cancel
              </Button>
            </div>
          ) : (
            <Button variant="destructive" onClick={() => setConfirmDelete(true)}>
              Delete everything
            </Button>
          )}
        </section>
      </DialogContent>
    </Dialog>
  );
}

/** M6: a sentence about the user helps the AI suggest rings for imported contacts. Stored locally. */
function AboutYou() {
  const [value, setValue] = useState('');
  useEffect(() => {
    db.meta.get('userContext').then((row) => setValue((row?.value as string | undefined) ?? ''));
  }, []);
  return (
    <section className="space-y-1.5">
      <Label htmlFor="about-you" className="text-sm font-medium">
        About you
      </Label>
      <Textarea
        id="about-you"
        rows={2}
        maxLength={500}
        value={value}
        placeholder="e.g. UW CS junior, interning at Amazon, in the Data Science Club"
        onChange={(e) => setValue(e.target.value)}
        onBlur={() => db.meta.put({ key: 'userContext', value: value.trim() })}
      />
      <p className="text-xs text-muted-foreground">Sent to the AI only when you use Sort with AI, to suggest who's close to you.</p>
    </section>
  );
}
