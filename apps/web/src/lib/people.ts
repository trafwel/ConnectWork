/**
 * M2/M3 — Person helpers · done
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
import { isConnectDateOnly } from './drift';

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

export function isOverdue(r: Reminder, now = new Date()): boolean {
  return !r.done && daysSince(r.dueDate, now) > 0;
}

const plural = (n: number, unit: string) => `${n} ${unit}${n === 1 ? '' : 's'} ago`;

export function describeLastContact(p: Person, now = new Date()): string {
  if (!p.lastContact) return 'No contact logged';
  // M10 (M4-O4): a LinkedIn "connected on" date is not a conversation, so say what it is.
  if (isConnectDateOnly(p)) return `No contact logged · connected ${describeLastContact({ ...p, source: 'manual' }, now).toLowerCase()}`;
  const days = daysSince(p.lastContact, now);
  if (days <= 0) return 'Today'; // a future date (bad import) reads as today rather than "-3 days ago"
  if (days === 1) return 'Yesterday';
  if (days < 30) return plural(days, 'day');
  const months = Math.round(days / 30);
  if (months < 12) return plural(months, 'month');
  return plural(Math.round(days / 365), 'year');
}
