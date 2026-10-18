/**
 * M7 — "Add to calendar" for any list of reminders. M11: straight into Google Calendar when
 * connected.
 *
 * Loads lib/ics with import() at click time, so the `ics` package (and its yup dependency,
 * ~40 KB) is a separate chunk instead of part of the main bundle (M2-E5).
 *
 * M11: ONE reminder while Google Calendar is connected → an all-day event in the user's
 * calendar (its id is saved, so a second click doesn't duplicate it). Several reminders
 * (Settings → Export all) stay a file: bulk-creating events is easy to regret. If Google
 * refuses (expired token), we say so and fall back to the .ics file.
 */
import { toast } from 'sonner';
import type { Person, Reminder } from '@connectwork/shared';
import { setReminderCalendarEvent } from '@/db/actions';
import { CalendarAuthError, createReminderEvent, isCalendarConnected } from './googleCalendar';

export async function addToCalendar(items: Array<{ reminder: Reminder; person: Person }>, filename?: string): Promise<void> {
  const only = items.length === 1 ? items[0]! : null;
  if (only && isCalendarConnected()) {
    if (only.reminder.calendarEventId) {
      toast('Already in your Google Calendar');
      return;
    }
    try {
      const id = await createReminderEvent(only.reminder, only.person);
      await setReminderCalendarEvent(only.reminder.id, id);
      toast.success(`Added "Follow up: ${only.person.name}" to Google Calendar`);
      return;
    } catch (e) {
      toast.error(e instanceof CalendarAuthError ? 'Google Calendar disconnected. Downloading a calendar file instead.' : 'Google Calendar refused it. Downloading a calendar file instead.');
    }
  }
  try {
    const { downloadIcs, icsFileName, remindersToIcs } = await import('./ics');
    downloadIcs(filename ?? icsFileName(items[0]?.person.name ?? 'reminders'), remindersToIcs(items));
  } catch {
    toast.error('Could not create the calendar file');
  }
}
