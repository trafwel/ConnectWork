/**
 * M1 — Date helpers · done
 *
 * WHAT THIS ACHIEVES
 *   Correct calendar-day math everywhere: due dates, "7 months ago", drift.
 *
 * KEY IDEAS
 *   - isoDate() uses the LOCAL calendar date. toISOString() is UTC: in Seattle after
 *     5 PM it already says tomorrow, which would mislabel "due today" every evening.
 *   - daysSince() counts midnight to midnight, so the time of day never changes the
 *     answer (11:59 PM yesterday → 12:01 AM today is 1 day, not 0).
 *
 * Tests: lib/dates.test.ts · Guide: §5.4
 */

const DAY_MS = 86_400_000;

/** Local calendar date as YYYY-MM-DD. */
export function isoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export const today = (): string => isoDate(new Date());

export function addDays(base: Date, days: number): Date {
  return new Date(base.getTime() + days * DAY_MS);
}

/** Whole calendar days from a YYYY-MM-DD date to `to` (local time). Negative if `date` is in the future. */
export function daysSince(date: string, to: Date = new Date()): number {
  const [y, m, d] = date.split('-').map(Number);
  const from = new Date(y!, m! - 1, d!);
  const end = new Date(to.getFullYear(), to.getMonth(), to.getDate());
  // Math.round absorbs the 23/25-hour days around daylight-saving changes.
  return Math.round((end.getTime() - from.getTime()) / DAY_MS);
}

/**
 * "2026-10-24" → "Sat, Oct 24" (adds the year when it isn't this year). Display only:
 * storage stays ISO. Parsed as a LOCAL date: new Date('2026-10-24') would be UTC
 * midnight, which shows as Oct 23 west of Greenwich.
 */
export function formatDate(date: string, now: Date = new Date()): string {
  const [y, m, d] = date.split('-').map(Number);
  if (!y || !m || !d) return date;
  const local = new Date(y, m - 1, d);
  return local.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    ...(y === now.getFullYear() ? {} : { year: 'numeric' }),
  });
}
