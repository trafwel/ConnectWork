/**
 * M4 — Import dialog · Owner: Person A · ~1 h (gets a "Sort with AI" action in M6)
 *
 * WHAT THIS ACHIEVES
 *   Drag in a CSV and see exactly what will happen ("120 people found in your LinkedIn
 *   export") before importing, and a clear summary afterwards
 *   ("Imported 114 people · 6 already here").
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
 *   8. (M6) Give that toast an action { label: 'Sort with AI', onClick: () => sortWithAi(newIds) }
 *      and a longer duration (15 s) when there are new people.
 *
 * DONE WHEN
 *   - demo/Connections.csv → 114 new people in ring 3 (6 were already in the seed);
 *     importing it again adds 0.
 *
 * Guide: §8.2
 */

export function ImportDialog() {
  // TODO(M4) steps 1–7
  return null;
}
