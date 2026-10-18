/**
 * M7 — RemindersPanel: what's due this week · done
 *
 * WHAT THIS ACHIEVES
 *   A to-do list for relationships: every reminder due in the next 7 days or
 *   overdue, oldest first, with Done / Snooze / Add to calendar. Together with
 *   the pulsing flags on the map, it makes sure follow-ups don't slip.
 *
 * HOW IT FITS
 *   Shown on the right when useStore.filter === 'due'. Reads reminders with
 *   useLiveQuery; writes through db/actions.ts (setReminderDone, snoozeReminder);
 *   "Add to calendar" uses lib/ics.ts now and Google Calendar after M11.
 *
 * STEPS
 *   1. useLiveQuery: all reminders + the people they belong to.
 *   2. Filter with dueReminders(reminders, 7) from lib/people.ts; sort by dueDate.
 *   3. Each row: person name (button → selectPerson), note, date (orange-red and
 *      "overdue" text if isOverdue), and buttons Done, Snooze 1 week, Add to calendar.
 *   4. Empty state: "Nothing due this week."
 *
 * DONE WHEN
 *   - Done removes the row and the node's flag; Snooze moves it a week;
 *     the .ics file opens in a calendar app.
 *
 * Guide: §13.3
 */

import { useLiveQuery } from 'dexie-react-hooks';
import { CalendarPlus, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { setReminderDone, snoozeReminder } from '@/db/actions';
import { db } from '@/db/db';
import { addToCalendar } from '@/lib/addToCalendar';
import { formatDate } from '@/lib/dates';
import { dueReminders, isOverdue } from '@/lib/people';
import { cn } from '@/lib/utils';
import { useStore } from '@/store/useStore';

export function RemindersPanel() {
  const selectPerson = useStore((s) => s.selectPerson);
  const setFilter = useStore((s) => s.setFilter);
  // Steps 1–2. One query for the reminders, one bulkGet for their people.
  const rows = useLiveQuery(async () => {
    const due = dueReminders(await db.reminders.toArray(), 7).sort((a, b) => a.dueDate.localeCompare(b.dueDate));
    const people = await db.people.bulkGet(due.map((r) => r.personId));
    return due.flatMap((reminder, i) => (people[i] ? [{ reminder, person: people[i] }] : []));
  }, []);

  return (
    <aside className="flex h-full w-[26rem] shrink-0 flex-col border-l bg-background" aria-label="Reminders due this week">
      <div className="flex items-start justify-between gap-2 border-b p-4">
        <div>
          <h2 className="text-lg font-semibold">Due this week</h2>
          <p className="text-sm text-muted-foreground">Overdue first, then the next 7 days.</p>
        </div>
        <Button variant="ghost" size="icon" aria-label="Close reminders" onClick={() => setFilter('all')}>
          <X />
        </Button>
      </div>
      {/* Step 3 */}
      <ul className="flex-1 space-y-2 overflow-y-auto p-3">
        {rows?.length ? (
          rows.map(({ reminder, person }) => {
            const overdue = isOverdue(reminder);
            return (
              <li key={reminder.id} className="space-y-1.5 rounded-md border p-3 text-sm">
                <div className="flex items-baseline justify-between gap-2">
                  <button className="truncate font-medium underline-offset-2 hover:underline" onClick={() => selectPerson(person.id)}>
                    {person.name}
                  </button>
                  <time dateTime={reminder.dueDate} className={cn('shrink-0 tabular-nums', overdue ? 'font-medium text-destructive' : 'text-muted-foreground')}>
                    {formatDate(reminder.dueDate)}
                    {overdue && ' · overdue'}
                  </time>
                </div>
                <p className="text-muted-foreground">{reminder.note}</p>
                <div className="flex flex-wrap gap-1.5">
                  <Button size="xs" onClick={() => void setReminderDone(reminder.id, true).then(() => toast.success(`Done: ${person.name}`))}>
                    Done
                  </Button>
                  <Button size="xs" variant="outline" onClick={() => void snoozeReminder(reminder.id, 7).then(() => toast(`Snoozed a week: ${person.name}`))}>
                    Snooze 1 week
                  </Button>
                  <Button size="xs" variant="outline" onClick={() => void addToCalendar([{ reminder, person }])}>
                    <CalendarPlus /> Add to calendar
                  </Button>
                </div>
              </li>
            );
          })
        ) : (
          // Step 4
          <li className="p-2 text-sm text-muted-foreground">{rows ? 'Nothing due this week.' : 'Loading…'}</li>
        )}
      </ul>
    </aside>
  );
}
