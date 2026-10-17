// ACCEPTANCE TESTS for M4 (lib/csv.ts).
// These are skipped until you build that milestone. They describe exactly what
// "done" means: when you finish it, change every `describe.skip(` below back to
// `describe(` and run `pnpm test` — they should all pass.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { Person } from '@connectwork/shared';
import {
  findMatch,
  guessMapping,
  mapGenericRows,
  normalizeLinkedInUrl,
  parseCsv,
  parseLinkedInDate,
  planImport,
} from './csv';

const demoCsv = readFileSync(new URL('../../../../demo/Connections.csv', import.meta.url), 'utf8');

const person = (over: Partial<Person>): Person => ({
  id: 'p_x',
  name: 'Test Person',
  ring: 3,
  primaryTag: 'LinkedIn',
  tags: ['LinkedIn'],
  source: 'linkedin',
  createdAt: '2026-10-17T00:00:00.000Z',
  ...over,
});

describe.skip('parseLinkedInDate', () => {
  it('parses LinkedIn day-month-year dates', () => {
    expect(parseLinkedInDate('15 Oct 2024')).toBe('2024-10-15');
    expect(parseLinkedInDate('3 Jan 2026')).toBe('2026-01-03');
    expect(parseLinkedInDate(' 07 September 2025 ')).toBe('2025-09-07');
  });

  it('returns undefined for unparseable values', () => {
    expect(parseLinkedInDate('')).toBeUndefined();
    expect(parseLinkedInDate('2024-10-15')).toBeUndefined();
    expect(parseLinkedInDate('15 Foo 2024')).toBeUndefined();
    expect(parseLinkedInDate(undefined)).toBeUndefined();
  });
});

describe.skip('parseCsv (LinkedIn)', () => {
  it('skips the notes lines and reads every row of the demo export', () => {
    const parsed = parseCsv(demoCsv);
    expect(parsed.kind).toBe('linkedin');
    if (parsed.kind !== 'linkedin') return;
    expect(parsed.drafts).toHaveLength(120);
    expect(parsed.skippedRows).toBe(0);
    const abbey = parsed.drafts.find((d) => d.name === 'Abbey Chen')!;
    expect(abbey.company).toBe('Microsoft');
    expect(abbey.linkedinUrl).toContain('linkedin.com/in/abbey-chen');
    expect(abbey.metAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('matches header names case-insensitively and in any order', () => {
    const csv = 'Notes:\n"something, with commas"\n\nfirst name,COMPANY,last name,Connected On,url\nAda,Analytical Engines,Lovelace,10 Dec 2025,https://linkedin.com/in/ada\n';
    const parsed = parseCsv(csv);
    expect(parsed.kind).toBe('linkedin');
    if (parsed.kind !== 'linkedin') return;
    expect(parsed.drafts).toEqual([
      {
        name: 'Ada Lovelace',
        company: 'Analytical Engines',
        metAt: '2025-12-10',
        linkedinUrl: 'https://linkedin.com/in/ada',
        email: undefined,
        role: undefined,
      },
    ]);
  });

  it('skips rows without a name', () => {
    const parsed = parseCsv('First Name,Last Name,Company\n,,Acme\nGrace,Hopper,Navy\n');
    expect(parsed.kind === 'linkedin' && parsed.drafts.length).toBe(1);
    expect(parsed.kind === 'linkedin' && parsed.skippedRows).toBe(1);
  });
});

describe.skip('generic CSV', () => {
  const text = 'Full Name,Organization,Title,Tags,Ring\nAlan Turing,Bletchley,Cryptanalyst,Work;Clubs,2\nNo Ring,,,,\n';

  it('falls back to generic parsing and guesses columns', () => {
    const parsed = parseCsv(text);
    expect(parsed.kind).toBe('generic');
    if (parsed.kind !== 'generic') return;
    expect(guessMapping(parsed.headers)).toEqual({ name: 'Full Name', company: 'Organization', role: 'Title', tags: 'Tags', ring: 'Ring' });
  });

  it('maps rows with the chosen columns', () => {
    const parsed = parseCsv(text);
    if (parsed.kind !== 'generic') throw new Error('expected generic');
    const drafts = mapGenericRows(parsed.rows, guessMapping(parsed.headers));
    expect(drafts[0]).toMatchObject({ name: 'Alan Turing', company: 'Bletchley', tags: ['Work', 'Clubs'], ring: 2 });
    expect(drafts[1]).toMatchObject({ name: 'No Ring', ring: undefined, tags: undefined });
  });

  it('returns nothing without a name column', () => {
    expect(mapGenericRows([{ a: 'x' }], {})).toEqual([]);
  });
});

describe.skip('dedupe', () => {
  it('normalizes LinkedIn URLs', () => {
    expect(normalizeLinkedInUrl('https://www.LinkedIn.com/in/ada/?trk=x')).toBe('linkedin.com/in/ada');
    expect(normalizeLinkedInUrl('linkedin.com/in/ada')).toBe('linkedin.com/in/ada');
  });

  it('matches by URL, then name + company, then email', () => {
    const existing = [
      person({ id: 'a', name: 'Ada', linkedinUrl: 'https://linkedin.com/in/ada' }),
      person({ id: 'b', name: 'Grace Hopper', company: 'Navy' }),
      person({ id: 'c', name: 'Someone', email: 'x@example.com' }),
    ];
    expect(findMatch(existing, { name: 'Different Name', linkedinUrl: 'http://www.linkedin.com/in/ada/' })?.id).toBe('a');
    expect(findMatch(existing, { name: 'grace hopper', company: 'NAVY' })?.id).toBe('b');
    expect(findMatch(existing, { name: 'Grace Hopper', company: 'Other' })).toBeUndefined();
    expect(findMatch(existing, { name: 'New', email: 'X@example.com' })?.id).toBe('c');
  });

  it('only fills empty fields and never overwrites user edits', () => {
    const existing = [person({ id: 'a', name: 'Ada', linkedinUrl: 'linkedin.com/in/ada', company: 'My edit' })];
    const plan = planImport(existing, [
      { name: 'Ada', linkedinUrl: 'linkedin.com/in/ada', company: 'From LinkedIn', role: 'Engineer' },
      { name: 'New Person' },
    ]);
    expect(plan.toUpdate).toEqual([{ id: 'a', patch: { role: 'Engineer' } }]);
    expect(plan.toAdd.map((d) => d.name)).toEqual(['New Person']);
  });

  it('collapses duplicates inside the same file', () => {
    const plan = planImport([], [
      { name: 'Ada', linkedinUrl: 'linkedin.com/in/ada' },
      { name: 'Ada L', linkedinUrl: 'https://linkedin.com/in/ada/' },
    ]);
    expect(plan.toAdd).toHaveLength(1);
    expect(plan.unchanged).toBe(1);
  });

  it('re-importing the same file adds nothing', () => {
    const parsed = parseCsv(demoCsv);
    if (parsed.kind !== 'linkedin') throw new Error('expected linkedin');
    const first = planImport([], parsed.drafts);
    const imported = first.toAdd.map((d, i) => person({ ...d, id: `p_${i}` } as Partial<Person>));
    const second = planImport(imported, parsed.drafts);
    expect(second.toAdd).toHaveLength(0);
    expect(second.toUpdate).toHaveLength(0);
  });
});
