/**
 * M2/M3 — Person helpers · done
 *
 * WHAT THIS ACHIEVES
 *   Small shared answers the UI needs everywhere: initials for ring-1 nodes, which
 *   reminders are due or overdue, and human wording for last contact
 *   ("7 months ago").
 *
 * Guide: §6.2, §7.3
 */
import type { Person, Reminder } from '@connectwork/shared';
import { daysSince } from './dates';

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? '') + (parts.length > 1 ? (parts.at(-1)?.[0] ?? '') : '')).toUpperCase();
}

/** Undone reminders due within `withinDays` (overdue included). */
export function dueReminders(reminders: Reminder[], withinDays = 7, now = new Date()): Reminder[] {
  return reminders.filter((r) => !r.done && -daysSince(r.dueDate, now) <= withinDays);
}

export function isOverdue(r: Reminder, now = new Date()): boolean {
  return !r.done && daysSince(r.dueDate, now) > 0;
}

export function describeLastContact(p: Person, now = new Date()): string {
  if (!p.lastContact) return 'No contact logged';
  const d = daysSince(p.lastContact, now);
  if (d <= 0) return 'Today';
  if (d === 1) return 'Yesterday';
  if (d < 30) return `${d} days ago`;
  const months = Math.round(d / 30);
  if (months < 12) return `${months} month${months === 1 ? '' : 's'} ago`;
  const years = Math.round(d / 365);
  return `${years} year${years === 1 ? '' : 's'} ago`;
}
