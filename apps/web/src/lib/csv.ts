import Papa from 'papaparse';
import type { Person, Ring } from '@connectwork/shared';

const MONTHS: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
};

/** A person read from a file, before ids and defaults are assigned. */
export type PersonDraft = Pick<Person, 'name'> &
  Partial<Pick<Person, 'company' | 'role' | 'school' | 'email' | 'linkedinUrl' | 'metAt' | 'ring' | 'tags'>>;

export type ParsedCsv =
  | { kind: 'linkedin'; drafts: PersonDraft[]; skippedRows: number }
  | { kind: 'generic'; headers: string[]; rows: Record<string, string>[] };

/** LinkedIn writes dates like "15 Oct 2024". Returns ISO date or undefined. */
export function parseLinkedInDate(value: string | undefined): string | undefined {
  const m = value?.trim().match(/^(\d{1,2})\s+([A-Za-z]{3})[A-Za-z]*\s+(\d{4})$/);
  if (!m) return undefined;
  const month = MONTHS[m[2]!.toLowerCase()];
  if (!month) return undefined;
  const day = Number(m[1]);
  if (day < 1 || day > 31) return undefined;
  return `${m[3]}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

const clean = (v: string | undefined) => {
  const t = v?.trim();
  return t ? t : undefined;
};

/** Case-insensitive column lookup. */
function getter(row: Record<string, string>) {
  const keys = new Map(Object.keys(row).map((k) => [k.trim().toLowerCase(), k]));
  return (name: string) => {
    const key = keys.get(name.toLowerCase());
    return key === undefined ? undefined : clean(row[key]);
  };
}

/**
 * LinkedIn's export starts with a few "Notes:" lines; the real header row
 * begins with "First Name,". Everything before it is skipped.
 */
export function parseCsv(text: string): ParsedCsv {
  const body = text.replace(/^\uFEFF/, '');
  const lines = body.split(/\r?\n/);
  const headerIndex = lines.findIndex((l) => /^\s*"?first name"?\s*,/i.test(l));

  if (headerIndex !== -1) {
    const csv = lines.slice(headerIndex).join('\n');
    const { data } = Papa.parse<Record<string, string>>(csv, { header: true, skipEmptyLines: 'greedy' });
    const drafts: PersonDraft[] = [];
    let skippedRows = 0;
    for (const row of data) {
      const get = getter(row);
      const name = [get('First Name'), get('Last Name')].filter(Boolean).join(' ');
      if (!name) {
        skippedRows++;
        continue;
      }
      drafts.push({
        name,
        linkedinUrl: get('URL'),
        email: get('Email Address'),
        company: get('Company'),
        role: get('Position'),
        metAt: parseLinkedInDate(get('Connected On')),
      });
    }
    return { kind: 'linkedin', drafts, skippedRows };
  }

  const { data, meta } = Papa.parse<Record<string, string>>(body, { header: true, skipEmptyLines: 'greedy' });
  return { kind: 'generic', headers: (meta.fields ?? []).filter(Boolean), rows: data };
}

export type MappableField = 'name' | 'company' | 'role' | 'school' | 'email' | 'tags' | 'ring';
export type ColumnMapping = Partial<Record<MappableField, string>>;

const GUESSES: Record<MappableField, RegExp> = {
  name: /^(full )?name$/i,
  company: /^(company|organi[sz]ation|employer)$/i,
  role: /^(role|title|position|job title)$/i,
  school: /^(school|university|college)$/i,
  email: /^e-?mail( address)?$/i,
  tags: /^tags?$/i,
  ring: /^ring$/i,
};

export function guessMapping(headers: string[]): ColumnMapping {
  const mapping: ColumnMapping = {};
  for (const field of Object.keys(GUESSES) as MappableField[]) {
    const match = headers.find((h) => GUESSES[field].test(h.trim()));
    if (match) mapping[field] = match;
  }
  return mapping;
}

export function mapGenericRows(rows: Record<string, string>[], mapping: ColumnMapping): PersonDraft[] {
  if (!mapping.name) return [];
  const col = (row: Record<string, string>, field: MappableField) => (mapping[field] ? clean(row[mapping[field]!]) : undefined);
  return rows.flatMap((row) => {
    const name = col(row, 'name');
    if (!name) return [];
    const ringNum = Number(col(row, 'ring'));
    const tags = col(row, 'tags')
      ?.split(';')
      .map((t) => t.trim())
      .filter(Boolean);
    return [
      {
        name,
        company: col(row, 'company'),
        role: col(row, 'role'),
        school: col(row, 'school'),
        email: col(row, 'email'),
        tags: tags?.length ? tags : undefined,
        ring: ringNum === 1 || ringNum === 2 || ringNum === 3 ? (ringNum as Ring) : undefined,
      },
    ];
  });
}

/** Strips protocol, www, query, hash and trailing slash so the same profile matches. */
export function normalizeLinkedInUrl(url: string | undefined): string | undefined {
  if (!url) return undefined;
  const t = url.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').split(/[?#]/)[0]!.replace(/\/+$/, '');
  return t || undefined;
}

const lower = (v: string | undefined) => v?.trim().toLowerCase() || undefined;

/** Dedupe order: LinkedIn URL, then name + company, then email. */
export function findMatch(existing: Person[], draft: PersonDraft): Person | undefined {
  const url = normalizeLinkedInUrl(draft.linkedinUrl);
  if (url) {
    const hit = existing.find((p) => normalizeLinkedInUrl(p.linkedinUrl) === url);
    if (hit) return hit;
  }
  const name = lower(draft.name);
  const company = lower(draft.company);
  if (name && company) {
    const hit = existing.find((p) => lower(p.name) === name && lower(p.company) === company);
    if (hit) return hit;
  }
  const email = lower(draft.email);
  if (email) return existing.find((p) => lower(p.email) === email);
  return undefined;
}

const FILLABLE = ['company', 'role', 'school', 'email', 'linkedinUrl', 'metAt'] as const;

export interface ImportPlan {
  toAdd: PersonDraft[];
  toUpdate: Array<{ id: string; patch: Partial<Person> }>;
  unchanged: number;
}

/**
 * Splits drafts into new people and updates. Updates only fill empty fields,
 * so nothing the user typed is ever overwritten. Duplicates inside the file
 * collapse into one.
 */
export function planImport(existing: Person[], drafts: PersonDraft[]): ImportPlan {
  const plan: ImportPlan = { toAdd: [], toUpdate: [], unchanged: 0 };
  const seenInFile: Person[] = [];

  for (const draft of drafts) {
    const asPerson = draft as unknown as Person;
    if (findMatch(seenInFile, draft)) {
      plan.unchanged++;
      continue;
    }
    seenInFile.push(asPerson);

    const match = findMatch(existing, draft);
    if (!match) {
      plan.toAdd.push(draft);
      continue;
    }
    const patch: Partial<Person> = {};
    for (const field of FILLABLE) {
      if (!match[field] && draft[field]) patch[field] = draft[field];
    }
    if (Object.keys(patch).length) plan.toUpdate.push({ id: match.id, patch });
    else plan.unchanged++;
  }
  return plan;
}
