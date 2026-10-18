import { describe, expect, it } from 'vitest';
import type { Reminder } from '@connectwork/shared';
import { dueReminders, initials } from './people';

describe('initials', () => {
  it('uses the first and last word', () => {
    expect(initials('Abbey Chen')).toBe('AC');
    expect(initials('  mary jane   watson ')).toBe('MW');
    expect(initials('Cher')).toBe('C');
    expect(initials('')).toBe('');
  });
});

describe('dueReminders', () => {
  const now = new Date(2026, 9, 17);
  const r = (id: string, dueDate: string, done = false): Reminder => ({ id, personId: 'p', dueDate, note: '', done });
  it('keeps overdue and due-within-a-week, drops later and done ones', () => {
    const list = [r('overdue', '2026-10-01'), r('today', '2026-10-17'), r('week', '2026-10-24'), r('later', '2026-10-25'), r('done', '2026-10-10', true)];
    expect(dueReminders(list, 7, now).map((x) => x.id)).toEqual(['overdue', 'today', 'week']);
  });
});
