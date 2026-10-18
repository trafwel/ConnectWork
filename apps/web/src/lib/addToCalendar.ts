/**
 * M7 — "Add to calendar" for any list of reminders.
 *
 * Loads lib/ics with import() at click time, so the `ics` package (and its yup dependency,
 * ~40 KB) is a separate chunk instead of part of the main bundle (M2-E5).
 */
import { toast } from 'sonner';
import type { Person, Reminder } from '@connectwork/shared';

export async function addToCalendar(items: Array<{ reminder: Reminder; person: Person }>, filename?: string): Promise<void> {
  try {
    const { downloadIcs, icsFileName, remindersToIcs } = await import('./ics');
    downloadIcs(filename ?? icsFileName(items[0]?.person.name ?? 'reminders'), remindersToIcs(items));
  } catch {
    toast.error('Could not create the calendar file');
  }
}
