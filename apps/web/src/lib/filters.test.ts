import { describe, expect, it } from 'vitest';
import type { Person } from '@connectwork/shared';
import { matchesFilter } from './filters';

const p = { id: 'p1', name: 'A', ring: 2, primaryTag: 'Work', tags: ['Work', 'Clubs'] } as Person;
const ctx = { dueIds: new Set(['p1']), driftingIds: new Set<string>() };

describe('matchesFilter', () => {
  it('handles all, due, drifting and tag names', () => {
    expect(matchesFilter(p, 'all', ctx)).toBe(true);
    expect(matchesFilter(p, 'due', ctx)).toBe(true);
    expect(matchesFilter(p, 'drifting', ctx)).toBe(false);
    expect(matchesFilter(p, 'Clubs', ctx)).toBe(true); // secondary tag counts
    expect(matchesFilter(p, 'Family', ctx)).toBe(false);
  });
});
