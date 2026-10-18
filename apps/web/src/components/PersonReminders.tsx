/**
 * M3 — A person's reminders · done (M7 added Add to calendar)
 *
 * WHAT THIS ACHIEVES
 *   Lists, adds, completes and deletes follow-up reminders for one person. Overdue
 *   dates turn orange-red so they stand out.
 *
 * STEPS
 *   1. useLiveQuery(() => db.reminders.where('personId').equals(personId).sortBy('dueDate'), [personId]).
 *   2. Each row: a checkbox (setReminderDone; aria-label `Mark "note" done`), the date
 *      (orange-red + medium weight if isOverdue), the note (struck through when done), and an
 *      icon-only delete button (aria-label `Delete reminder "note"`).
 *   3. Empty state: "No reminders".
 *   4. Add form: <Input type="date"> defaulting to today + 7 days, a note input, and an "Add"
 *      button → addReminder(personId, date, note), then clear the note.
 *
 * Guide: §7.3
 */

import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { CalendarPlus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { addReminder, deleteReminder, setReminderDone } from '@/db/actions';
import { db } from '@/db/db';
import { addToCalendar } from '@/lib/addToCalendar';
import { addDays, formatDate, isoDate } from '@/lib/dates';
import { isOverdue } from '@/lib/people';
import { cn, sectionHeading } from '@/lib/utils';

export function PersonReminders({ personId }: { personId: string }) {
  const reminders = useLiveQuery(() => db.reminders.where('personId').equals(personId).sortBy('dueDate'), [personId]);
  const [date, setDate] = useState(() => isoDate(addDays(new Date(), 7)));
  const [note, setNote] = useState('');

  return (
    <section aria-labelledby="reminders-heading" className="space-y-2">
      <h3 id="reminders-heading" className={sectionHeading}>
        Reminders
      </h3>
      <ul className="space-y-1">
        {reminders?.length ? (
          reminders.map((r) => {
            const overdue = isOverdue(r);
            return (
              <li key={r.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={r.done}
                  onChange={(e) => setReminderDone(r.id, e.target.checked)}
                  aria-label={`Mark "${r.note}" done`}
                />
                {/* Overdue: color AND a word, never color alone */}
                <time dateTime={r.dueDate} className={cn('shrink-0 tabular-nums', overdue && 'font-medium text-destructive')}>
                  {formatDate(r.dueDate)}
                  {overdue && ' · overdue'}
                </time>
                <span className={cn('flex-1 truncate', r.done && 'text-muted-foreground line-through')}>{r.note}</span>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  aria-label={`Add "${r.note}" to calendar`}
                  onClick={async () => {
                    const person = await db.people.get(personId);
                    if (person) await addToCalendar([{ reminder: r, person }]);
                  }}
                >
                  <CalendarPlus />
                </Button>
                <Button variant="ghost" size="icon-xs" aria-label={`Delete reminder "${r.note}"`} onClick={() => deleteReminder(r.id)}>
                  <Trash2 />
                </Button>
              </li>
            );
          })
        ) : (
          <li className="text-sm text-muted-foreground">No reminders</li>
        )}
      </ul>
      <form
        className="flex items-center gap-2"
        onSubmit={async (e) => {
          e.preventDefault();
          await addReminder(personId, date, note);
          setNote('');
        }}
      >
        <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-36" aria-label="Due date" required />
        <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="What to follow up on" aria-label="Reminder note" maxLength={200} />
        <Button type="submit" variant="outline" size="sm">
          Add
        </Button>
      </form>
    </section>
  );
}
