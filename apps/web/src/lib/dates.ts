/**
 * M1 — Date helpers · done
 *
 * WHAT THIS ACHIEVES
 *   Correct calendar-day math everywhere: due dates, "7 months ago", drift.
 *
 * HOW IT WAS BUILT
 *   1. isoDate() formats the LOCAL calendar date. toISOString() would use UTC and
 *      show tomorrow's date in the evening west of Greenwich (Seattle!).
 *   2. daysSince() compares midnight to midnight, so the time of day doesn't change the answer.
 *
 * DONE WHEN
 *   - lib/dates.test.ts passes.
 *
 * Guide: §5.4
 */
const DAY = 86_400_000;

/** Local calendar date as YYYY-MM-DD. */
export function isoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export const today = () => isoDate(new Date());

export function addDays(base: Date, days: number): Date {
  return new Date(base.getTime() + days * DAY);
}

/** Whole days from a YYYY-MM-DD date to `to` (local). */
export function daysSince(date: string, to: Date = new Date()): number {
  const [y, m, d] = date.split('-').map(Number);
  const from = new Date(y!, m! - 1, d!);
  const end = new Date(to.getFullYear(), to.getMonth(), to.getDate());
  return Math.round((end.getTime() - from.getTime()) / DAY);
}
