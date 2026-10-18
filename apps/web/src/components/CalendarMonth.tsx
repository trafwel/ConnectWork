/**
 * M14 — CalendarMonth · done
 *
 * WHAT THIS ACHIEVES
 *   A month at a glance: every reminder and meeting on its day. Clicking a day
 *   highlights those people on the map. Nice to have; cut first if time is short.
 *
 * HOW IT FITS
 *   A fourth view in the top bar (Map | Groups | List | Month), the same switch as the others
 *   (the scaffold suggested a filter tab; one place for "how do I look at my network" is
 *   simpler). Reads db.reminders and db.meetings live; the grid math is lib/monthGrid.ts (tested).
 *
 * STEPS
 *   1. Compute the grid: first day of the month → back to Monday; 6 rows × 7 columns.
 *   2. A CSS grid `grid-cols-7`; weekday headers; each cell = day number + up to 3
 *      items ("Follow up: John", "3:30 PM Coffee with John") + "+N more".
 *   3. Previous / next month buttons and "Today"; today outlined.
 *   4. Day click → setHighlights(people with items that day) and switch back to the map.
 *   5. Each day cell is a <button> with an aria-label like "Sunday, October 18, 2 items".
 *
 * DONE WHEN
 *   - Reminders and sample meetings appear on the right days; clicking a day highlights people.
 *
 * Guide: §21
 */
import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { Person } from '@connectwork/shared';
import { Button } from '@/components/ui/button';
import { db } from '@/db/db';
import { isoDate, today } from '@/lib/dates';
import { itemsByDay, monthGrid } from '@/lib/monthGrid';
import { cn } from '@/lib/utils';
import { useStore } from '@/store/useStore';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MAX_SHOWN = 3;

export function CalendarMonth({ people }: { people: Person[] }) {
  const setHighlights = useStore((s) => s.setHighlights);
  const setView = useStore((s) => s.setView);
  const setAgent = useStore((s) => s.setAgent);
  const reminders = useLiveQuery(() => db.reminders.toArray(), []);
  const meetings = useLiveQuery(() => db.meetings.toArray(), []);
  const now = new Date();
  const [offset, setOffset] = useState(0); // months from this one
  const shown = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  const todayIso = today();

  // Steps 1–2.
  const year = shown.getFullYear();
  const month = shown.getMonth();
  const days = monthGrid(year, month); // 42 small objects: cheaper than memoizing
  const byDay = useMemo(() => itemsByDay(reminders ?? [], meetings ?? [], people, todayIso), [reminders, meetings, people, todayIso]);

  // Step 4. The map then dims everyone else, like an AI answer; the card says why.
  const openDay = (day: Date, ids: string[]) => {
    if (!ids.length) return;
    setHighlights(ids);
    setAgent({
      agentAnswer: `${day.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}: ${ids.length === 1 ? '1 person' : `${ids.length} people`} with something planned.`,
      agentError: false,
      agentChecked: false,
    });
    setView('map');
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col p-4">
      {/* Step 3 */}
      <div className="mb-3 flex items-center gap-2">
        <h2 className="text-lg font-semibold" aria-live="polite">
          {shown.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </h2>
        <span className="flex-1" />
        <Button size="sm" variant="outline" aria-label="Previous month" onClick={() => setOffset((o) => o - 1)}>
          <ChevronLeft />
        </Button>
        <Button size="sm" variant="outline" disabled={offset === 0} onClick={() => setOffset(0)}>
          Today
        </Button>
        <Button size="sm" variant="outline" aria-label="Next month" onClick={() => setOffset((o) => o + 1)}>
          <ChevronRight />
        </Button>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-7 grid-rows-[auto_repeat(6,minmax(0,1fr))] gap-px overflow-hidden rounded-md border bg-border">
        {WEEKDAYS.map((d) => (
          <div key={d} className="bg-muted px-2 py-1 text-xs font-medium text-muted-foreground" aria-hidden="true">
            {d}
          </div>
        ))}
        {days.map((day) => {
          const iso = isoDate(day);
          const items = byDay.get(iso) ?? [];
          const ids = [...new Set(items.flatMap((i) => i.personIds))];
          const inMonth = day.getMonth() === month;
          const isToday = iso === todayIso;
          const label = `${day.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}, ${items.length ? `${items.length} ${items.length === 1 ? 'item' : 'items'}: ${items.map((i) => i.label).join('; ')}` : 'nothing planned'}`;
          return (
            // Step 5. A real button even when empty, so arrow-free Tab order stays predictable.
            <button
              key={iso}
              aria-label={label}
              aria-current={isToday ? 'date' : undefined}
              disabled={!items.length}
              onClick={() => openDay(day, ids)}
              className={cn(
                'flex min-h-0 flex-col gap-0.5 overflow-hidden bg-background p-1.5 text-left text-xs',
                !inMonth && 'text-muted-foreground/60',
                items.length > 0 && 'hover:bg-muted',
                isToday && 'ring-2 ring-foreground ring-inset',
              )}
            >
              <span className={cn('font-medium tabular-nums', isToday && 'font-bold')}>{day.getDate()}</span>
              {items.slice(0, MAX_SHOWN).map((i, n) => (
                <span
                  key={n}
                  className={cn(
                    'truncate rounded-sm px-1',
                    i.kind === 'meeting' ? 'bg-muted' : 'border',
                    i.overdue && 'border-destructive text-destructive',
                  )}
                >
                  {i.time && <span className="tabular-nums">{i.time} </span>}
                  {i.label}
                  {i.overdue && ' · overdue'}
                </span>
              ))}
              {items.length > MAX_SHOWN && <span className="text-muted-foreground">+{items.length - MAX_SHOWN} more</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
