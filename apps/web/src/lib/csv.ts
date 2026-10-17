/**
 * M4 — CSV import logic · done
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
 *      lowercase company (M4 review: only when BOTH have a company, so namesakes don't merge)
 *      → lowercase email.
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
import Papa from 'papaparse';
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

/** Same limits as the person card's inputs, so imported text can't be bigger than typed text. */
const MAX_NAME = 120;
const MAX_FIELD = 300;

/** Trims, turns "" into undefined, and caps the length. */
const clean = (value: string | undefined, max = MAX_FIELD): string | undefined => value?.trim().slice(0, max) || undefined;

/** Only keep LinkedIn profile URLs: a crafted file must not plant a "javascript:" link. */
const cleanLinkedInUrl = (value: string | undefined) => {
  const v = clean(value);
  return v && /^(https?:\/\/)?([\w-]+\.)?linkedin\.com\//i.test(v) ? v : undefined;
};
const cleanEmail = (value: string | undefined) => {
  const v = clean(value);
  return v && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? v : undefined;
};

const MONTHS: Record<string, number> = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };

// Step 2. "15 Oct 2024" → "2024-10-15". Built from the parts, never via Date (no time zones).
export function parseLinkedInDate(value: string | undefined): string | undefined {
  const m = value?.trim().match(/^(\d{1,2})\s+([A-Za-z]{3})[A-Za-z]*\s+(\d{4})$/);
  if (!m) return undefined;
  const day = Number(m[1]);
  const month = MONTHS[m[2]!.toLowerCase()];
  if (!month || day < 1 || day > 31) return undefined;
  return `${m[3]}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/** Case-insensitive column lookup: getter(row, 'first name') finds "First Name", "FIRST NAME", … */
function columnGetter(headers: string[]) {
  const byLower = new Map(headers.map((h) => [h.trim().toLowerCase(), h]));
  return (row: Record<string, string>, name: string) => {
    const key = byLower.get(name);
    return key === undefined ? undefined : row[key];
  };
}

const parseOptions = { header: true, skipEmptyLines: 'greedy' } as const;

// Step 3.
export function parseCsv(text: string): ParsedCsv {
  const body = text.replace(/^\uFEFF/, ''); // a byte-order mark would hide the first header
  const lines = body.split(/\r?\n/);
  // LinkedIn puts a "Notes:" paragraph ABOVE the real header.
  const headerIndex = lines.findIndex((line) => /^\s*"?first name"?\s*,/i.test(line));

  if (headerIndex === -1) {
    const result = Papa.parse<Record<string, string>>(body, parseOptions);
    return { kind: 'generic', headers: result.meta.fields ?? [], rows: result.data };
  }

  const result = Papa.parse<Record<string, string>>(lines.slice(headerIndex).join('\n'), parseOptions);
  const get = columnGetter(result.meta.fields ?? []);
  const drafts: PersonDraft[] = [];
  let skippedRows = 0;
  for (const row of result.data) {
    const name = clean([get(row, 'first name'), get(row, 'last name')].map((x) => x?.trim()).filter(Boolean).join(' '), MAX_NAME);
    if (!name) {
      skippedRows++;
      continue;
    }
    drafts.push({
      name,
      linkedinUrl: cleanLinkedInUrl(get(row, 'url')),
      email: cleanEmail(get(row, 'email address')),
      company: clean(get(row, 'company')),
      role: clean(get(row, 'position')),
      metAt: parseLinkedInDate(get(row, 'connected on')),
    });
  }
  return { kind: 'linkedin', drafts, skippedRows };
}

const FIELD_PATTERNS: Record<MappableField, RegExp> = {
  name: /^(full )?name$/i,
  company: /^(company|organi[sz]ation|employer)$/i,
  role: /^(role|title|position|job title)$/i,
  school: /^(school|university|college)$/i,
  email: /^e-?mail( address)?$/i,
  tags: /^tags?$/i,
  ring: /^ring$/i,
};

// Step 4. A first guess the user can correct in the dialog.
export function guessMapping(headers: string[]): ColumnMapping {
  const mapping: ColumnMapping = {};
  for (const field of Object.keys(FIELD_PATTERNS) as MappableField[]) {
    const header = headers.find((h) => FIELD_PATTERNS[field].test(h.trim()));
    if (header !== undefined) mapping[field] = header;
  }
  return mapping;
}

// Step 5.
export function mapGenericRows(rows: Record<string, string>[], mapping: ColumnMapping): PersonDraft[] {
  if (!mapping.name) return [];
  const col = (row: Record<string, string>, field: MappableField) => (mapping[field] ? row[mapping[field]!] : undefined);
  return rows.flatMap((row) => {
    const name = clean(col(row, 'name'), MAX_NAME);
    if (!name) return [];
    const tags = col(row, 'tags')
      ?.split(';')
      .map((t) => t.trim().slice(0, 40))
      .filter(Boolean);
    const ring = Number(col(row, 'ring'));
    return [
      {
        name,
        company: clean(col(row, 'company')),
        role: clean(col(row, 'role')),
        school: clean(col(row, 'school')),
        email: cleanEmail(col(row, 'email')),
        tags: tags?.length ? tags : undefined,
        ring: ring === 1 || ring === 2 || ring === 3 ? ring : undefined,
      },
    ];
  });
}

// Step 6. "https://www.LinkedIn.com/in/ada/?trk=x" and "linkedin.com/in/ada" are the same person.
export function normalizeLinkedInUrl(url: string | undefined): string | undefined {
  const v = url
    ?.trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/[?#].*$/, '')
    .replace(/\/+$/, '');
  return v || undefined;
}

/** The three dedupe keys, strongest first. Name + company needs a company on BOTH sides. */
function matchKeys(p: Pick<Person, 'name'> & Partial<Pick<Person, 'company' | 'email' | 'linkedinUrl'>>) {
  const company = p.company?.trim().toLowerCase();
  return {
    url: normalizeLinkedInUrl(p.linkedinUrl),
    nameCompany: company ? `${p.name.trim().toLowerCase()}|${company}` : undefined,
    email: p.email?.trim().toLowerCase() || undefined,
  };
}

/** Looks people up by each key in O(1); built once per import instead of scanning per row. */
class MatchIndex {
  private maps = { url: new Map<string, Person>(), nameCompany: new Map<string, Person>(), email: new Map<string, Person>() };

  add(p: Person) {
    const keys = matchKeys(p);
    for (const k of ['url', 'nameCompany', 'email'] as const) {
      const key = keys[k];
      if (key && !this.maps[k].has(key)) this.maps[k].set(key, p);
    }
  }

  find(draft: PersonDraft): Person | undefined {
    const keys = matchKeys(draft);
    for (const k of ['url', 'nameCompany', 'email'] as const) {
      const key = keys[k];
      const hit = key ? this.maps[k].get(key) : undefined;
      if (hit) return hit;
    }
    return undefined;
  }
}

// Step 7. Single lookup (M9 snap uses this); planImport uses the indexed version.
export function findMatch(existing: Person[], draft: PersonDraft): Person | undefined {
  const index = new MatchIndex();
  existing.forEach((p) => index.add(p));
  return index.find(draft);
}

const FILLABLE = ['company', 'role', 'school', 'email', 'linkedinUrl', 'metAt'] as const;

// Step 8. Fill only EMPTY fields: the user's own edits always win over the file.
export function planImport(existing: Person[], drafts: PersonDraft[]): ImportPlan {
  const index = new MatchIndex();
  existing.forEach((p) => index.add(p));
  const seenInFile = new MatchIndex();
  const plan: ImportPlan = { toAdd: [], toUpdate: [], unchanged: 0 };

  drafts.forEach((draft, i) => {
    // Duplicates inside the same file collapse into the first one.
    const asPerson = { ...draft, id: `draft_${i}` } as Person;
    if (seenInFile.find(draft)) {
      plan.unchanged++;
      return;
    }
    seenInFile.add(asPerson);

    const match = index.find(draft);
    if (!match) {
      plan.toAdd.push(draft);
      return;
    }
    const patch: Partial<Person> = {};
    for (const field of FILLABLE) {
      if (!match[field] && draft[field]) patch[field] = draft[field];
    }
    if (Object.keys(patch).length) plan.toUpdate.push({ id: match.id, patch });
    else plan.unchanged++;
  });
  return plan;
}
