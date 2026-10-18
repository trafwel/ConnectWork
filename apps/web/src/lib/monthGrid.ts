/**
 * M14 — the month view's pure part: which 42 days to draw and what happens on each.
 * Tested in monthGrid.test.ts; components/CalendarMonth.tsx draws it.
 */
import type { Meeting, Person, Reminder } from '@connectwork/shared';
import { addDays, isoDate } from './dates';

export interface DayItem {
  kind: 'reminder' | 'meeting';
  label: string;
  personIds: string[];
  /** "3:30 PM" for meetings; reminders are all-day. */
  time?: string;
  overdue?: boolean;
}

/** Step 1. 6 weeks × 7 days, Monday first, starting on or before the 1st of the month. */
export function monthGrid(year: number, month: number): Date[] {
  const first = new Date(year, month, 1);
  const back = (first.getDay() + 6) % 7; // Monday = 0
  const start = addDays(first, -back);
  start.setHours(0, 0, 0, 0);
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i); // DST-safe
    return d;
  });
}

/** Open reminders and meetings, by local YYYY-MM-DD, in time order (reminders first: they're all-day). */
export function itemsByDay(reminders: Reminder[], meetings: Meeting[], people: Person[], todayIso: string): Map<string, DayItem[]> {
  const name = new Map(people.map((p) => [p.id, p.name]));
  const out = new Map<string, DayItem[]>();
  const add = (day: string, item: DayItem) => {
    const list = out.get(day);
    if (list) list.push(item);
    else out.set(day, [item]);
  };
  for (const r of reminders) {
    if (r.done || !name.has(r.personId)) continue;
    add(r.dueDate, { kind: 'reminder', label: `Follow up: ${name.get(r.personId)}`, personIds: [r.personId], overdue: r.dueDate < todayIso });
  }
  for (const m of [...meetings].sort((a, b) => a.start.localeCompare(b.start))) {
    const start = new Date(m.start);
    add(isoDate(start), {
      kind: 'meeting',
      label: m.title,
      personIds: m.attendeePersonIds,
      time: start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
    });
  }
  return out;
}
