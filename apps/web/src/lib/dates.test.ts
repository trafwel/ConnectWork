// ACCEPTANCE TESTS for M1 (lib/dates.ts).
// These are skipped until you build that milestone. They describe exactly what
// "done" means: when you finish it, change every `describe.skip(` below back to
// `describe(` and run `pnpm test` — they should all pass.
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

describe('formatDate', async () => {
  const { formatDate } = await import('./dates');
  const now = new Date(2026, 9, 17);
  it('shows weekday, month and day, with the year only when it differs', () => {
    expect(formatDate('2026-10-24', now)).toBe('Sat, Oct 24');
    expect(formatDate('2025-03-01', now)).toBe('Sat, Mar 1, 2025');
  });
  it('uses the local calendar day (no UTC shift) and passes bad input through', () => {
    expect(formatDate('2026-01-01', now)).toBe('Thu, Jan 1');
    expect(formatDate('soon', now)).toBe('soon');
  });
});
