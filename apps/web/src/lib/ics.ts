/**
 * M7 — Calendar export (.ics) · done
 *
 * WHAT THIS ACHIEVES
 *   "Add to calendar" that works for everyone, with no sign-in: a reminder
 *   becomes an all-day event file that opens in Google, Apple or Outlook
 *   calendar. It's the fallback that always works even if Google sign-in
 *   (M11) is unavailable at the demo.
 *
 * HOW IT FITS
 *   PersonReminders and RemindersPanel call downloadIcs(…remindersToIcs(…)).
 *   Callers load this file with `await import('@/lib/ics')` on click, so the `ics` package
 *   (and its yup dependency, ~40 KB) stays out of the main bundle (M7 review, M2-E5).
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
import { createEvents, type EventAttributes } from 'ics';
import type { Person, Reminder } from '@connectwork/shared';

/** Safe in a file name: letters, digits and dashes only. */
const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40) || 'reminders';

// Step 2. One all-day event per reminder. The `ics` library escapes text, so a note can't
// smuggle extra lines (e.g. a fake "BEGIN:VEVENT") into the file.
export function remindersToIcs(items: Array<{ reminder: Reminder; person: Person }>): string {
  const events: EventAttributes[] = items.map(({ reminder, person }) => {
    const [y, m, d] = reminder.dueDate.split('-').map(Number);
    // All-day: DTEND is the NEXT day (the end is exclusive). An explicit end, not `duration`:
    // the library writes `DURATION:P1DT`, which is invalid (RFC 5545 needs a time after "T").
    const next = new Date(y!, m! - 1, d! + 1); // local date math also handles month/year ends
    const description = [reminder.note, person.linkedinUrl].filter(Boolean).join('\n');
    return {
      title: `Follow up: ${person.name}`,
      start: [y!, m!, d!],
      end: [next.getFullYear(), next.getMonth() + 1, next.getDate()],
      description,
      uid: `${reminder.id}@connectwork`, // stable: importing again updates instead of duplicating
      productId: 'connectwork',
    };
  });
  const { error, value } = createEvents(events);
  if (error || !value) throw new Error('Could not create the calendar file');
  return value;
}

/** Suggested file name, e.g. connectwork-john-park.ics. */
export const icsFileName = (name: string) => `connectwork-${slug(name)}.ics`;

// Step 3
export function downloadIcs(filename: string, icsText: string): void {
  const url = URL.createObjectURL(new Blob([icsText], { type: 'text/calendar;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 0); // revoking in the same tick can cancel the download
}
