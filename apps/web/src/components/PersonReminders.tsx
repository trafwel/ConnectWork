/**
 * M3 — A person's reminders · done (Add to calendar arrives in M7)
 *
 * WHAT THIS ACHIEVES
 *   Lists, adds, completes and deletes follow-up reminders for one person.
 *   Overdue dates turn orange-red. New reminders default to one week out.
 *
 * Guide: §7.3
 */
import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { db } from '@/db/db';
import { addReminder, deleteReminder, setReminderDone } from '@/db/actions';
import { addDays, isoDate } from '@/lib/dates';
import { isOverdue } from '@/lib/people';
import { cn } from '@/lib/utils';

export function PersonReminders({ personId }: { personId: string }) {
  const reminders = useLiveQuery(
    () => db.reminders.where('personId').equals(personId).sortBy('dueDate'),
    [personId],
  );
  const [date, setDate] = useState(() => isoDate(addDays(new Date(), 7)));
  const [note, setNote] = useState('');

  return (
    <section aria-labelledby="reminders-heading" className="space-y-2">
      <h3 id="reminders-heading" className="text-sm font-medium">
        Reminders
      </h3>
      <ul className="space-y-1">
        {reminders?.length ? (
          reminders.map((r) => (
            <li key={r.id} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={r.done}
                onChange={(e) => setReminderDone(r.id, e.target.checked)}
                aria-label={`Mark "${r.note}" done`}
              />
              <span className={cn('tabular-nums', isOverdue(r) && 'font-medium text-[#D55E00]')}>{r.dueDate}</span>
              <span className={cn('flex-1 truncate', r.done && 'text-muted-foreground line-through')}>{r.note}</span>
              <Button variant="ghost" size="icon-xs" aria-label={`Delete reminder "${r.note}"`} onClick={() => deleteReminder(r.id)}>
                <Trash2 />
              </Button>
            </li>
          ))
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
        <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="What to follow up on" aria-label="Reminder note" />
        <Button type="submit" variant="outline" size="sm">
          Add
        </Button>
      </form>
    </section>
  );
}
