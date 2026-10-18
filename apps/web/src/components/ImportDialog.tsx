/**
 * M4 — Import dialog · done (gets a "Sort with AI" action in M6)
 *
 * WHAT THIS ACHIEVES
 *   Drag in a CSV and see exactly what will happen ("30 people found in your LinkedIn
 *   export") before importing, and a clear summary afterwards
 *   ("Imported 24 people · 6 already here").
 *
 * HOW IT FITS
 *   Opened from the top bar (store.importOpen). Uses lib/csv.ts and applyImport
 *   (db/actions.ts). The file is read with file.text() in the browser and never leaves it.
 *
 * STEPS
 *   1. Controlled Dialog; reset all local state (file name, parsed result, mapping, busy) on close.
 *   2. Description text: how to get LinkedIn's export (Settings → Data privacy → Get a copy of
 *      your data → Connections) and "The file is read in your browser and never uploaded."
 *   3. A <label> drop zone wrapping a visually hidden <input type="file" accept=".csv,text/csv">:
 *      onDragOver (preventDefault + highlight), onDragLeave, onDrop (read files[0]). Reject
 *      non-CSV files with a toast. Reset the input's value after reading.
 *   4. readFile: parseCsv(await file.text()); for generic files set mapping = guessMapping(headers).
 *   5. Generic files: a grid of native <select>s, one per field (Name required, Company, Role,
 *      School, Email, Tags "separate with ;", Ring 1–3), each with "—" plus every header.
 *   6. drafts = useMemo: linkedin → parsed.drafts; generic → mapGenericRows(rows, mapping).
 *      Status line in aria-live: "N people found…", "Choose which column holds names.", or
 *      "No people found in this file."
 *   7. Import button "Import N" (disabled when 0 or busy): plan = planImport(await db.people.toArray(), drafts);
 *      newIds = await applyImport(plan, linkedin ? 'linkedin' : 'manual', 'LinkedIn'); close; toast
 *      "Imported X people · updated Y · Z already here".
 *   7b. (open-issues step, M4-O3) The toast has Undo → undoImport(newIds, plan.toUpdate).
 *   8. (M6 ✓) Give that toast an action { label: 'Sort with AI', onClick: () => sortWithAi(newIds) }
 *      and a longer duration (15 s) when there are new people.
 *
 * DONE WHEN
 *   - demo/Connections.csv → 24 new people in ring 3 (6 were already in the seed; the export was
 *     cut from 120 to 30 rows for the demo on Oct 18);
 *     importing it again adds 0.
 *
 * Guide: §8.2
 */

import { useMemo, useState, type DragEvent } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { applyImport, undoImport } from '@/db/actions';
import { sortWithAi } from '@/lib/aiFlows';
import { db } from '@/db/db';
import { guessMapping, mapGenericRows, parseCsv, planImport, type ColumnMapping, type MappableField, type ParsedCsv } from '@/lib/csv';
import { cn } from '@/lib/utils';
import { useStore } from '@/store/useStore';

/** A real LinkedIn export of 30k connections is about 3 MB; anything bigger is not a contacts file. */
const MAX_FILE_BYTES = 10 * 1024 * 1024;
/** The map's layout is tuned for a few hundred people; more than this would freeze the tab. */
const MAX_PEOPLE = 2000;

const FIELDS: Array<{ field: MappableField; label: string }> = [
  { field: 'name', label: 'Name (required)' },
  { field: 'company', label: 'Company' },
  { field: 'role', label: 'Role' },
  { field: 'school', label: 'School' },
  { field: 'email', label: 'Email' },
  { field: 'tags', label: 'Tags (separate with ;)' },
  { field: 'ring', label: 'Ring (1–3)' },
];

const plural = (n: number, one: string, many = `${one}s`) => `${n.toLocaleString()} ${n === 1 ? one : many}`;

export function ImportDialog() {
  const open = useStore((s) => s.importOpen);
  const setDialog = useStore((s) => s.setDialog);
  const [fileName, setFileName] = useState<string | null>(null);
  const [parsed, setParsed] = useState<ParsedCsv | null>(null);
  const [mapping, setMapping] = useState<ColumnMapping>({});
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  // Live, so the preview stays right if people change while the dialog is open.
  const existing = useLiveQuery(() => (open ? db.people.toArray() : []), [open]);

  // Step 1
  const close = () => {
    setDialog('import', false);
    setFileName(null);
    setParsed(null);
    setMapping({});
    setDragging(false);
  };

  // Steps 3–4. Read in the browser: the file is never uploaded.
  const readFile = async (file: File | undefined) => {
    if (!file) return;
    if (!/\.csv$/i.test(file.name) && file.type !== 'text/csv') {
      toast.error('Please choose a .csv file');
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      toast.error('That file is too large to be a contacts export');
      return;
    }
    const result = parseCsv(await file.text());
    setFileName(file.name);
    setParsed(result);
    setMapping(result.kind === 'generic' ? guessMapping(result.headers) : {});
  };

  // Step 6
  const allDrafts = useMemo(
    () => (!parsed ? [] : parsed.kind === 'linkedin' ? parsed.drafts : mapGenericRows(parsed.rows, mapping)),
    [parsed, mapping],
  );
  const drafts = useMemo(() => allDrafts.slice(0, MAX_PEOPLE), [allDrafts]);
  // Memoized on stable inputs, so the plan is computed once per file/mapping, not every render.
  const plan = useMemo(() => (existing ? planImport(existing, drafts) : null), [existing, drafts]);
  const linkedin = parsed?.kind === 'linkedin';

  const status = !parsed
    ? ''
    : parsed.kind === 'generic' && !mapping.name
      ? 'Choose which column holds names.'
      : allDrafts.length === 0
        ? 'No people found in this file.'
        : [
            `${plural(allDrafts.length, 'person', 'people')} found${linkedin ? ' in your LinkedIn export' : ''}`,
            plan && `${plural(plan.toAdd.length, 'new person', 'new people')}`,
            plan?.toUpdate.length ? `${plural(plan.toUpdate.length, 'to fill in')}` : null,
            plan?.unchanged ? `${plan.unchanged.toLocaleString()} already here` : null,
            allDrafts.length > MAX_PEOPLE ? `only the first ${MAX_PEOPLE.toLocaleString()} will be imported` : null,
            linkedin && parsed.skippedRows ? `${plural(parsed.skippedRows, 'row')} without a name skipped` : null,
          ]
            .filter(Boolean)
            .join(' · ');

  // Step 7
  const runImport = async () => {
    if (!plan || busy) return;
    setBusy(true);
    try {
      // Re-plan against the database as it is NOW, so the numbers can't be stale.
      const fresh = planImport(await db.people.toArray(), drafts);
      const newIds = await applyImport(fresh, linkedin ? 'linkedin' : 'manual', 'LinkedIn');
      close();
      const changed = newIds.length + fresh.toUpdate.length;
      toast.success(
        [`Imported ${plural(newIds.length, 'person', 'people')}`, fresh.toUpdate.length && `updated ${fresh.toUpdate.length}`, fresh.unchanged && `${fresh.unchanged} already here`]
          .filter(Boolean)
          .join(' · '),
        // M6: "Sort with AI" is the main action when there are new people; Undo (M4-O3) is the
        // secondary one. Undo removes the new people and clears only the fields this import filled.
        changed
          ? {
              duration: 15_000,
              ...(newIds.length ? { action: { label: 'Sort with AI', onClick: () => void sortWithAi(newIds) } } : {}),
              [newIds.length ? 'cancel' : 'action']: { label: 'Undo', onClick: () => void undoImport(newIds, fresh.toUpdate).then(() => toast('Import undone')) },
            }
          : undefined,
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Import failed');
    } finally {
      setBusy(false);
    }
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    void readFile(e.dataTransfer.files[0]);
  };

  const importable = plan ? plan.toAdd.length + plan.toUpdate.length : 0;

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? setDialog('import', true) : close())}>
      <DialogContent className="sm:max-w-lg">
        {/* Step 2 */}
        <DialogHeader>
          <DialogTitle>Import contacts</DialogTitle>
          <DialogDescription>
            LinkedIn: Settings → Data privacy → Get a copy of your data → Connections. Any CSV with a name column works too. The file is read in
            your browser and never uploaded.
          </DialogDescription>
        </DialogHeader>

        {/* Step 3. A <label> makes the whole drop zone a keyboard- and click-friendly file picker. */}
        <label
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={cn(
            'flex cursor-pointer flex-col items-center justify-center gap-1 rounded-md border-2 border-dashed p-6 text-center text-sm transition-colors focus-within:ring-2 focus-within:ring-ring',
            dragging ? 'border-primary bg-muted' : 'border-input hover:bg-muted/50',
          )}
        >
          <span className="font-medium">{fileName ?? 'Drop a CSV here, or click to choose'}</span>
          <span className="text-muted-foreground">{fileName ? 'Choose another file' : 'Connections.csv from LinkedIn, or your own'}</span>
          <input
            type="file"
            accept=".csv,text/csv"
            className="sr-only"
            onChange={(e) => {
              void readFile(e.target.files?.[0]);
              e.target.value = ''; // so choosing the same file again still fires onChange
            }}
          />
        </label>

        {/* Step 5. Generic files: let the user say which column is which. */}
        {parsed?.kind === 'generic' && (
          <div className="grid grid-cols-[9rem_1fr] items-center gap-x-3 gap-y-2 text-sm">
            {FIELDS.map(({ field, label }) => (
              <label key={field} className="contents">
                <span>{label}</span>
                <select
                  value={mapping[field] ?? ''}
                  onChange={(e) => setMapping((m) => ({ ...m, [field]: e.target.value || undefined }))}
                  className="h-8 rounded-md border bg-background px-2"
                >
                  <option value="">—</option>
                  {parsed.headers.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>
        )}

        <p className="min-h-5 text-sm" aria-live="polite">
          {status}
        </p>

        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={close}>
            Cancel
          </Button>
          <Button onClick={runImport} disabled={!importable || busy}>
            {busy ? 'Importing…' : `Import ${importable.toLocaleString()}`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
