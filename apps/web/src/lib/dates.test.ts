import { describe, expect, it } from 'vitest';
import { addDays, daysSince, isoDate } from './dates';

describe('dates', () => {
  it('formats local dates as YYYY-MM-DD', () => {
    expect(isoDate(new Date(2026, 0, 5))).toBe('2026-01-05');
  });

  it('counts whole days between dates', () => {
    const now = new Date(2026, 9, 17, 23, 30);
    expect(daysSince('2026-10-17', now)).toBe(0);
    expect(daysSince('2026-10-10', now)).toBe(7);
    expect(daysSince(isoDate(addDays(now, -210)), now)).toBe(210);
  });
});
