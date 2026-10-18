// ACCEPTANCE TESTS for M5 (lib/exactMatch.ts).
// These are skipped until you build that milestone. They describe exactly what
// "done" means: when you finish it, change every `describe(` below back to
// `describe(` and run `pnpm test` — they should all pass.
import { describe, expect, it } from 'vitest';
import type { Person } from '@connectwork/shared';
import { exactMatches } from './exactMatch';

const p = (id: string, company?: string, school?: string): Person => ({
  id, name: id, ring: 3, primaryTag: 'Work', tags: [], company, school, source: 'manual', createdAt: '',
});
const people = [
  p('a', 'Microsoft'),
  p('b', 'microsoft'),
  p('c', 'Expedia Group', 'University of Washington'),
  p('d', 'Google'),
  p('e', 'HP'),
];

describe('exactMatches', () => {
  it('finds everyone at a company named in the question, any case', () => {
    expect(exactMatches('Who do I know at Microsoft?', people)).toEqual(['a', 'b']);
  });

  it('matches multi-word companies and schools', () => {
    expect(exactMatches('anyone from expedia group?', people)).toEqual(['c']);
    expect(exactMatches('Who went to University of Washington', people)).toEqual(['c']);
  });

  it('needs whole words and ignores very short values', () => {
    expect(exactMatches('Who knows Googleplex trivia?', people)).toEqual([]);
    expect(exactMatches('Who can help me ship this?', people)).toEqual([]);
  });

  it('returns nothing when no company or school is named', () => {
    expect(exactMatches('Who should I follow up with?', people)).toEqual([]);
  });
});

describe('groundModelIds (M5 review)', async () => {
  const { groundModelIds } = await import('./exactMatch');
  const folks = [
    { ...p('uw', 'Amazon', 'University of Washington') },
    { ...p('su', undefined, 'Seattle University') },
    { ...p('intern', 'University of Washington'), role: 'former Microsoft intern' },
    p('ms', 'Microsoft'),
  ];
  it('drops model ids whose own data does not mention the named school or company', () => {
    expect(groundModelIds('Who went to University of Washington?', folks, ['uw', 'su'])).toEqual(['uw']);
  });
  it('keeps people whose role mentions it', () => {
    expect(groundModelIds('Who do I know at Microsoft?', folks, ['ms', 'intern'])).toEqual(['ms', 'intern']);
  });
  it('passes everything through when the question names nothing', () => {
    expect(groundModelIds('Who should I follow up with?', folks, ['su', 'ms'])).toEqual(['su', 'ms']);
  });
});
