/**
 * M4 — CSV import logic · Owner: Person B · ~1.5 h
 *
 * WHAT THIS ACHIEVES
 *   Solves "nobody will type in 300 contacts": LinkedIn's official Connections.csv
 *   export (or any CSV with a name column) becomes people on the map, without
 *   duplicates and without ever overwriting something the user typed. We use the
 *   official export — scraping LinkedIn would break its terms.
 *
 * HOW IT FITS
 *   ImportDialog reads the file in the browser (nothing is uploaded) → parseCsv →
 *   planImport against existing people → applyImport (db/actions.ts). M9 reuses
 *   findMatch to dedupe people read from photos. Pure functions → easy to unit-test.
 *
 * STEPS
 *   1. `pnpm --filter @connectwork/web add papaparse` and `-D @types/papaparse`.
 *   2. parseLinkedInDate("15 Oct 2024") → "2024-10-15". Regex
 *      /^(\d{1,2})\s+([A-Za-z]{3})[A-Za-z]*\s+(\d{4})$/ on the trimmed value, a month map
 *      jan…dec → 1…12, day 1–31; anything else → undefined.
 *   3. parseCsv(text):
 *      a. Strip a byte-order mark: text.replace(/^\uFEFF/, '') — write the escape, not
 *         the invisible character (ESLint flags it as irregular whitespace).
 *      b. Split into lines; find the first line matching /^\s*"?first name"?\s*,/i. LinkedIn
 *         puts "Notes:" lines ABOVE the real header.
 *      c. Found → Papa.parse(lines.slice(index).join('\n'), { header: true, skipEmptyLines: 'greedy' }).
 *         Look columns up BY NAME, case-insensitively (a helper that maps lowercased header →
 *         real key). name = First Name + " " + Last Name; skip rows with no name (count them);
 *         linkedinUrl = URL, email = Email Address, company = Company, role = Position,
 *         metAt = parseLinkedInDate(Connected On). Return { kind: 'linkedin', drafts, skippedRows }.
 *      d. Not found → parse the whole text with header: true and return
 *         { kind: 'generic', headers: meta.fields, rows }.
 *   4. guessMapping(headers): regexes per field — name /^(full )?name$/i,
 *      company /^(company|organi[sz]ation|employer)$/i, role /^(role|title|position|job title)$/i,
 *      school /^(school|university|college)$/i, email /^e-?mail( address)?$/i, tags /^tags?$/i, ring /^ring$/i.
 *   5. mapGenericRows(rows, mapping): no name column → []; per row: name required; tags split
 *      on ';' and trimmed; ring kept only if it is 1, 2 or 3.
 *   6. normalizeLinkedInUrl: lowercase, strip http(s)://, www., query/hash, trailing slashes.
 *   7. findMatch(existing, draft) — dedupe order: normalized LinkedIn URL → lowercase name +
 *      lowercase company → lowercase email.
 *   8. planImport(existing, drafts):
 *      - remember drafts already seen in THIS file (findMatch against them) → count as unchanged;
 *      - no match in existing → toAdd;
 *      - match → patch ONLY fields that are empty on the existing person (company, role, school,
 *        email, linkedinUrl, metAt). Nothing to fill → unchanged. Never overwrite user edits.
 *
 * DONE WHEN
 *   - lib/csv.test.ts passes (unskip it): the demo file gives 120 drafts, re-import adds 0.
 *
 * Guide: §8.1
 */
import type { Person } from '@connectwork/shared';

/** A person read from a file, before ids and defaults are assigned. */
export type PersonDraft = Pick<Person, 'name'> &
  Partial<Pick<Person, 'company' | 'role' | 'school' | 'email' | 'linkedinUrl' | 'metAt' | 'ring' | 'tags'>>;

export type ParsedCsv =
  | { kind: 'linkedin'; drafts: PersonDraft[]; skippedRows: number }
  | { kind: 'generic'; headers: string[]; rows: Record<string, string>[] };

export type MappableField = 'name' | 'company' | 'role' | 'school' | 'email' | 'tags' | 'ring';
export type ColumnMapping = Partial<Record<MappableField, string>>;

export interface ImportPlan {
  toAdd: PersonDraft[];
  toUpdate: Array<{ id: string; patch: Partial<Person> }>;
  unchanged: number;
}

export function parseLinkedInDate(_value: string | undefined): string | undefined {
  // TODO(M4) step 2
  return undefined;
}

export function parseCsv(_text: string): ParsedCsv {
  // TODO(M4) step 3
  return { kind: 'generic', headers: [], rows: [] };
}

export function guessMapping(_headers: string[]): ColumnMapping {
  // TODO(M4) step 4
  return {};
}

export function mapGenericRows(_rows: Record<string, string>[], _mapping: ColumnMapping): PersonDraft[] {
  // TODO(M4) step 5
  return [];
}

export function normalizeLinkedInUrl(_url: string | undefined): string | undefined {
  // TODO(M4) step 6
  return undefined;
}

export function findMatch(_existing: Person[], _draft: PersonDraft): Person | undefined {
  // TODO(M4) step 7
  return undefined;
}

export function planImport(_existing: Person[], _drafts: PersonDraft[]): ImportPlan {
  // TODO(M4) step 8
  return { toAdd: [], toUpdate: [], unchanged: 0 };
}
