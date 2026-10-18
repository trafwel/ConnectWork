// ACCEPTANCE TESTS for M4 (lib/csv.ts).
// These are skipped until you build that milestone. They describe exactly what
// "done" means: when you finish it, change every `describe(` below back to
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

describe('parseLinkedInDate', () => {
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

describe('parseCsv (LinkedIn)', () => {
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

describe('generic CSV', () => {
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

describe('dedupe', () => {
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

// M4 self-review hardening (added beyond the acceptance tests above).
describe('import hardening', () => {
  it('drops non-LinkedIn URLs and bad emails, so a file cannot plant a javascript: link', () => {
    const parsed = parseCsv('First Name,Last Name,URL,Email Address\nEve,X,javascript:alert(1),not-an-email\nBob,Y,https://evil.example/in/bob,bob@example.com\n');
    if (parsed.kind !== 'linkedin') throw new Error('expected linkedin');
    expect(parsed.drafts.map((d) => [d.linkedinUrl, d.email])).toEqual([
      [undefined, undefined],
      [undefined, 'bob@example.com'],
    ]);
  });

  it('reads a file that starts with a byte-order mark', () => {
    const parsed = parseCsv('\uFEFFFirst Name,Last Name\nGrace,Hopper\n');
    expect(parsed.kind === 'linkedin' && parsed.drafts[0]?.name).toBe('Grace Hopper');
  });

  it('caps text to the same lengths as the person card', () => {
    const long = 'x'.repeat(1000);
    const parsed = parseCsv(`First Name,Last Name,Company\n${long},Y,${long}\n`);
    if (parsed.kind !== 'linkedin') throw new Error('expected linkedin');
    expect(parsed.drafts[0]!.name.length).toBe(120);
    expect(parsed.drafts[0]!.company!.length).toBe(300);
  });

  it('does not merge namesakes when neither has a company', () => {
    const existing = [person({ id: 'a', name: 'Alex Kim' })];
    expect(findMatch(existing, { name: 'Alex Kim' })).toBeUndefined();
    expect(planImport(existing, [{ name: 'Alex Kim' }]).toAdd).toHaveLength(1);
  });

  it('plans a large import quickly (indexed matching)', () => {
    const existing = Array.from({ length: 3000 }, (_, i) => person({ id: `e${i}`, name: `Person ${i}`, linkedinUrl: `linkedin.com/in/p${i}` }));
    const drafts = Array.from({ length: 3000 }, (_, i) => ({ name: `Person ${i}`, linkedinUrl: `https://www.linkedin.com/in/p${i + 1500}/` }));
    const t0 = performance.now();
    const plan = planImport(existing, drafts);
    expect(performance.now() - t0).toBeLessThan(200);
    expect(plan.toAdd).toHaveLength(1500);
    expect(plan.unchanged).toBe(1500);
  });
});
