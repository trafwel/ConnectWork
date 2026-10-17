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
