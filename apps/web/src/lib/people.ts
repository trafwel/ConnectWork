/**
 * M2/M3 — Person helpers · ~20 min
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

export function initials(_name: string): string {
  // TODO(M2) step 1
  return '';
}

export function dueReminders(_reminders: Reminder[], _withinDays = 7, _now = new Date()): Reminder[] {
  // TODO(M2) step 2
  return [];
}

export function isOverdue(_r: Reminder, _now = new Date()): boolean {
  // TODO(M3) step 3
  return false;
}

export function describeLastContact(_p: Person, _now = new Date()): string {
  // TODO(M3) step 4
  return '';
}
