/**
 * M4 — Import dialog · done (gets a "Sort with AI" action in M6)
 *
 * WHAT THIS ACHIEVES
 *   Drag in a CSV and see exactly what will happen ("120 people found") before
 *   importing; a clear summary afterwards ("Imported 114 people · 6 already here").
 *
 * HOW IT FITS
 *   Opened from the top bar. Uses lib/csv.ts and applyImport. The file is read
 *   with file.text() in the browser and never leaves it.
 *
 * HOW IT WAS BUILT
 *   1. Drop zone + hidden file input (CSV only), drag-over highlight.
 *   2. Generic files show a column-mapping grid with guessed defaults.
 *   3. Live count; Import button disabled until there is something to import.
 *   4. Result toast with added / updated / already-here counts.
 *
 * Guide: §8.2
 */
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { FileUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { db } from '@/db/db';
import { applyImport } from '@/db/actions';
import {
  guessMapping,
  mapGenericRows,
  parseCsv,
  planImport,
  type ColumnMapping,
  type MappableField,
  type ParsedCsv,
  type PersonDraft,
} from '@/lib/csv';
import { cn } from '@/lib/utils';
import { useStore } from '@/store/useStore';

const FIELD_LABELS: Record<MappableField, string> = {
  name: 'Name (required)',
  company: 'Company',
  role: 'Role',
  school: 'School',
  email: 'Email',
  tags: 'Tags (separate with ;)',
  ring: 'Ring (1–3)',
};

export function ImportDialog() {
  const open = useStore((s) => s.importOpen);
  const setDialog = useStore((s) => s.setDialog);
  const [fileName, setFileName] = useState<string | null>(null);
  const [parsed, setParsed] = useState<ParsedCsv | null>(null);
  const [mapping, setMapping] = useState<ColumnMapping>({});
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);

  const reset = () => {
    setFileName(null);
    setParsed(null);
    setMapping({});
    setBusy(false);
  };

  const readFile = async (file: File) => {
    if (!/\.csv$/i.test(file.name) && file.type !== 'text/csv') {
      toast.error('Please choose a .csv file');
      return;
    }
    const result = parseCsv(await file.text());
    setFileName(file.name);
    setParsed(result);
    if (result.kind === 'generic') setMapping(guessMapping(result.headers));
  };

  const drafts: PersonDraft[] = useMemo(() => {
    if (!parsed) return [];
    return parsed.kind === 'linkedin' ? parsed.drafts : mapGenericRows(parsed.rows, mapping);
  }, [parsed, mapping]);

  const runImport = async () => {
    if (!parsed || !drafts.length) return;
    setBusy(true);
    const plan = planImport(await db.people.toArray(), drafts);
    const isLinkedIn = parsed.kind === 'linkedin';
    await applyImport(plan, isLinkedIn ? 'linkedin' : 'manual', 'LinkedIn');
    setDialog('import', false);
    reset();
    const parts = [`Imported ${plan.toAdd.length} ${plan.toAdd.length === 1 ? 'person' : 'people'}`];
    if (plan.toUpdate.length) parts.push(`updated ${plan.toUpdate.length}`);
    if (plan.unchanged) parts.push(`${plan.unchanged} already here`);
    toast.success(parts.join(' · '), {
      description: plan.toAdd.length ? 'New people are in the outer ring. Sorting them with AI comes next.' : undefined,
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setDialog('import', o);
        if (!o) reset();
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Import contacts</DialogTitle>
          <DialogDescription>
            Upload LinkedIn's Connections.csv (Settings → Data privacy → Get a copy of your data → Connections) or any CSV with a name column.
            The file is read in your browser and never uploaded.
          </DialogDescription>
        </DialogHeader>

        <label
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            const file = e.dataTransfer.files[0];
            if (file) readFile(file);
          }}
          className={cn(
            'flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed p-6 text-center text-sm transition-colors',
            dragging ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50',
          )}
        >
          <FileUp className="size-6 text-muted-foreground" aria-hidden="true" />
          <span>{fileName ?? 'Drop a CSV here or click to choose'}</span>
          <input
            type="file"
            accept=".csv,text/csv"
            className="sr-only"
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = '';
              if (file) readFile(file);
            }}
          />
        </label>

        {parsed?.kind === 'generic' && (
          <section aria-labelledby="mapping-heading" className="space-y-2">
            <h3 id="mapping-heading" className="text-sm font-medium">
              Match your columns
            </h3>
            <div className="grid grid-cols-[10rem_1fr] items-center gap-2 text-sm">
              {(Object.keys(FIELD_LABELS) as MappableField[]).map((field) => (
                <MappingRow
                  key={field}
                  label={FIELD_LABELS[field]}
                  headers={parsed.headers}
                  value={mapping[field]}
                  onChange={(v) => setMapping((m) => ({ ...m, [field]: v }))}
                />
              ))}
            </div>
          </section>
        )}

        {parsed && (
          <p className="text-sm" aria-live="polite">
            {drafts.length
              ? `${drafts.length} ${drafts.length === 1 ? 'person' : 'people'} found${parsed.kind === 'linkedin' ? ' in your LinkedIn export' : ''}.`
              : parsed.kind === 'generic' && !mapping.name
                ? 'Choose which column holds names.'
                : 'No people found in this file.'}
          </p>
        )}

        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setDialog('import', false)}>
            Cancel
          </Button>
          <Button onClick={runImport} disabled={!drafts.length || busy}>
            {busy ? 'Importing…' : `Import${drafts.length ? ` ${drafts.length}` : ''}`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function MappingRow({
  label,
  headers,
  value,
  onChange,
}: {
  label: string;
  headers: string[];
  value: string | undefined;
  onChange: (v: string | undefined) => void;
}) {
  const id = `map-${label}`;
  return (
    <>
      <label htmlFor={id}>{label}</label>
      <select
        id={id}
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value || undefined)}
        className="h-8 rounded-md border bg-background px-2"
      >
        <option value="">—</option>
        {headers.map((h) => (
          <option key={h} value={h}>
            {h}
          </option>
        ))}
      </select>
    </>
  );
}
