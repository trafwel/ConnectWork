/**
 * M2/M3 — Person helpers · steps 1–2 done (M2); 3–4 are M3
 *
 * WHAT THIS ACHIEVES
 *   Small shared answers the UI needs everywhere: initials for ring-1 nodes, which
 *   reminders are due or overdue, and human wording for last contact ("7 months ago").
 *
 * STEPS
 *   1. initials(name): first letter of the first word + first letter of the last word
 *      (if more than one word), uppercased. "Abbey Chen" → "AC".
 *   2. dueReminders(reminders, withinDays = 7, now): undone reminders whose due date is
 *      at most `withinDays` ahead — overdue ones included. With daysSince (lib/dates.ts):
 *        !r.done && -daysSince(r.dueDate, now) <= withinDays
 *   3. isOverdue(r, now): !r.done && daysSince(r.dueDate, now) > 0.
 *   4. describeLastContact(p, now): no lastContact → "No contact logged"; 0 → "Today";
 *      1 → "Yesterday"; < 30 → "N days ago"; < 12 months → "N month(s) ago"
 *      (months = round(days/30)); else "N year(s) ago".
 *
 * Guide: §6.2, §7.3
 */
import type { Person, Reminder } from '@connectwork/shared';
import { daysSince } from './dates';

/** "Abbey Chen" → "AC", "Mary Jane Watson" → "MW": at most two letters so it fits a ring-1 node. */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? (parts.at(-1)?.[0] ?? '') : '';
  return (first + last).toUpperCase();
}

/** Undone reminders due within `withinDays`, overdue ones included (daysSince is negative for future dates). */
export function dueReminders(reminders: Reminder[], withinDays = 7, now = new Date()): Reminder[] {
  return reminders.filter((r) => !r.done && -daysSince(r.dueDate, now) <= withinDays);
}

export function isOverdue(_r: Reminder, _now = new Date()): boolean {
  // TODO(M3) step 3
  return false;
}

export function describeLastContact(_p: Person, _now = new Date()): string {
  // TODO(M3) step 4
  return '';
}
