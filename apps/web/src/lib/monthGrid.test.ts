import { describe, expect, it } from 'vitest';
import type { Person } from '@connectwork/shared';
import { isoDate } from './dates';
import { itemsByDay, monthGrid } from './monthGrid';

describe('monthGrid', () => {
  it('is 42 days, Monday first, covering the whole month', () => {
    const days = monthGrid(2026, 9); // October 2026 starts on a Thursday
    expect(days).toHaveLength(42);
    expect(isoDate(days[0]!)).toBe('2026-09-28'); // the Monday before
    expect(days[0]!.getDay()).toBe(1);
    expect(days.map(isoDate)).toContain('2026-10-31');
    expect(isoDate(days[41]!)).toBe('2026-11-08');
  });
  it('starts on the 1st when the month starts on a Monday', () => {
    expect(isoDate(monthGrid(2026, 5)[0]!)).toBe('2026-06-01');
  });
});

describe('itemsByDay', () => {
  const people: Person[] = [{ id: 'p_john', name: 'John Park', ring: 2, primaryTag: 'School', tags: [], source: 'seed', createdAt: '' }];
  it('puts open reminders and meetings on their local day, marks overdue, skips done and orphans', () => {
    const map = itemsByDay(
      [
        { id: 'r1', personId: 'p_john', dueDate: '2026-10-18', note: '', done: false },
        { id: 'r2', personId: 'p_john', dueDate: '2026-10-10', note: '', done: false },
        { id: 'r3', personId: 'p_john', dueDate: '2026-10-18', note: '', done: true },
        { id: 'r4', personId: 'p_gone', dueDate: '2026-10-18', note: '', done: false },
      ],
      [{ id: 'm', title: 'Coffee with John', start: new Date(2026, 9, 18, 15, 30).toISOString(), end: '', attendeeEmails: [], attendeePersonIds: ['p_john'] }],
      people,
      '2026-10-17',
    );
    expect(map.get('2026-10-18')).toEqual([
      { kind: 'reminder', label: 'Follow up: John Park', personIds: ['p_john'], overdue: false },
      { kind: 'meeting', label: 'Coffee with John', personIds: ['p_john'], time: '3:30 PM' },
    ]);
    expect(map.get('2026-10-10')![0]!.overdue).toBe(true);
  });
});
