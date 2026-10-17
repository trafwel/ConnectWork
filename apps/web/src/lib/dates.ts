/**
 * M1 — Date helpers · ~15 min
 *
 * WHAT THIS ACHIEVES
 *   Correct calendar-day math everywhere: due dates, "7 months ago", drift.
 *
 * STEPS
 *   1. isoDate(d): the LOCAL calendar date as YYYY-MM-DD, built from getFullYear(),
 *      getMonth() + 1 and getDate() (pad to 2 digits). Don't use toISOString(): it's
 *      UTC, so in Seattle after 5 PM it already shows tomorrow's date.
 *   2. today() = isoDate(new Date()).
 *   3. addDays(base, n) = new Date(base.getTime() + n * 86_400_000).
 *   4. daysSince(date, to = new Date()): parse 'YYYY-MM-DD' into a local midnight
 *      (new Date(y, m - 1, d)), take `to` at local midnight too, and return
 *      Math.round(difference / 86_400_000). Midnight-to-midnight means the time of day
 *      never changes the answer.
 *
 * DONE WHEN
 *   - lib/dates.test.ts passes (unskip it).
 *
 * Guide: §5.4
 */

export function isoDate(_d: Date): string {
  // TODO(M1) step 1
  throw new Error('TODO(M1): isoDate is not implemented yet');
}

export function today(): string {
  // TODO(M1) step 2
  throw new Error('TODO(M1): today is not implemented yet');
}

export function addDays(_base: Date, _days: number): Date {
  // TODO(M1) step 3
  throw new Error('TODO(M1): addDays is not implemented yet');
}

export function daysSince(_date: string, _to: Date = new Date()): number {
  // TODO(M1) step 4
  throw new Error('TODO(M1): daysSince is not implemented yet');
}
