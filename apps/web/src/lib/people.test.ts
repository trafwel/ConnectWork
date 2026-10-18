import { describe, expect, it } from 'vitest';
import type { Person, Reminder } from '@connectwork/shared';
import { describeLastContact, dueReminders, initials, isOverdue } from './people';

const now = new Date(2026, 9, 17);
const reminder = (id: string, dueDate: string, done = false): Reminder => ({ id, personId: 'p', dueDate, note: '', done });
const person = (lastContact?: string): Person => ({ id: 'p', name: 'A', ring: 2, primaryTag: 'Work', tags: [], source: 'seed', createdAt: '', lastContact });

describe('initials', () => {
  it('uses the first and last word', () => {
    expect(initials('Abbey Chen')).toBe('AC');
    expect(initials('  mary jane   watson ')).toBe('MW');
    expect(initials('Cher')).toBe('C');
    expect(initials('')).toBe('');
  });
});

describe('dueReminders', () => {
  it('keeps overdue and due-within-a-week, drops later and done ones', () => {
    const list = [
      reminder('overdue', '2026-10-01'),
      reminder('today', '2026-10-17'),
      reminder('week', '2026-10-24'),
      reminder('later', '2026-10-25'),
      reminder('done', '2026-10-10', true),
    ];
    expect(dueReminders(list, 7, now).map((x) => x.id)).toEqual(['overdue', 'today', 'week']);
  });
});

describe('isOverdue', () => {
  it('marks only undone past reminders', () => {
    expect(isOverdue(reminder('a', '2026-10-16'), now)).toBe(true);
    expect(isOverdue(reminder('b', '2026-10-17'), now)).toBe(false);
    expect(isOverdue(reminder('c', '2026-10-01', true), now)).toBe(false);
  });
});

describe('describeLastContact', () => {
  it('describes last contact in plain words', () => {
    expect(describeLastContact(person(), now)).toBe('No contact logged');
    expect(describeLastContact(person('2026-10-17'), now)).toBe('Today');
    expect(describeLastContact(person('2026-10-16'), now)).toBe('Yesterday');
    expect(describeLastContact(person('2026-10-07'), now)).toBe('10 days ago');
    expect(describeLastContact(person('2026-03-21'), now)).toBe('7 months ago'); // John, 210 days
    expect(describeLastContact(person('2024-10-17'), now)).toBe('2 years ago');
    expect(describeLastContact(person('2026-10-20'), now)).toBe('Today'); // future date from a bad import
    // M10: a LinkedIn connect date alone is not contact.
    const imported = { ...person('2024-10-17'), source: 'linkedin' as const, metAt: '2024-10-17' };
    expect(describeLastContact(imported, now)).toBe('No contact logged · connected 2 years ago');
  });
});
