/**
 * M7 — Calendar export (.ics) · Owner: Person A · ~20 min
 *
 * WHAT THIS ACHIEVES
 *   "Add to calendar" that works for everyone, with no sign-in: a reminder
 *   becomes an all-day event file that opens in Google, Apple or Outlook
 *   calendar. It's the fallback that always works even if Google sign-in
 *   (M11) is unavailable at the demo.
 *
 * HOW IT FITS
 *   PersonReminders and RemindersPanel call downloadIcs(…remindersToIcs(…)).
 *   Settings gets "Export all reminders" (every undone reminder in one file).
 *
 * STEPS
 *   1. `pnpm --filter @connectwork/web add ics`
 *   2. remindersToIcs(): map each { reminder, person } to an EventAttributes:
 *        title: `Follow up: ${person.name}`, start: [y, m, d] from reminder.dueDate,
 *        duration: { days: 1 } (all-day), description: note + LinkedIn URL,
 *        uid: `${reminder.id}@connectwork` (stable, so re-imports update instead of duplicating).
 *      Call createEvents(); throw if it returns an error.
 *   3. downloadIcs(): Blob with type 'text/calendar', temporary <a download>, revoke the URL.
 *   4. Test lib/ics.test.ts: output contains BEGIN:VCALENDAR and one BEGIN:VEVENT per reminder,
 *      and the date of a reminder due 2026-10-18 appears as 20261018.
 *
 * DONE WHEN
 *   - The downloaded file opens in Google Calendar / Apple Calendar on the right day.
 *
 * Guide: §13.4
 */
import type { Person, Reminder } from '@connectwork/shared';

export function remindersToIcs(_items: Array<{ reminder: Reminder; person: Person }>): string {
  // TODO(M7) step 2
  throw new Error('TODO(M7): remindersToIcs is not implemented yet');
}

export function downloadIcs(_filename: string, _icsText: string): void {
  // TODO(M7) step 3
  throw new Error('TODO(M7): downloadIcs is not implemented yet');
}
