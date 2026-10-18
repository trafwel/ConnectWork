/**
 * M10 — ListView: the accessible twin of the map · done
 *
 * WHAT THIS ACHIEVES
 *   Everything the map shows, as a sortable table that works with a keyboard
 *   and a screen reader. It makes the app usable without seeing the graph, and
 *   it's a faster way to scan 150 people. Accessibility is part of how we score
 *   on design and on "who it helps".
 *
 * HOW IT FITS
 *   TopBar Map/List toggle → useStore.view → App renders <RingMap /> or <ListView />.
 *   Uses the same matchesFilter (lib/filters.ts) and highlightIds as the map,
 *   so AI answers and filters work identically in both views. Drift comes from the same
 *   filterContext.drift map App computes once, so the list and the map can't disagree.
 *
 * STEPS
 *   1. TopBar: Map / List toggle (App.tsx renders a <Segmented> radio group: same meaning as two
 *      aria-pressed buttons, plus arrow keys) → setView.
 *   2. A real <table> with <caption className="sr-only">Your network</caption>.
 *      Columns: Name, Ring, Tag (dot + text), Company, Last contact (describeLastContact),
 *      Next reminder.
 *   3. Sortable headers: a <button> inside each <th>, aria-sort on the <th>
 *      ('ascending' | 'descending' | 'none'). Default sort: ring, then name.
 *   4. Rows filtered with matchesFilter; highlighted rows get a left accent bar and
 *      aria-selected="true"; when anything is highlighted, sort highlighted rows first.
 *   5. Clicking a row (or Enter on its name button) → selectPerson(id).
 *   6. Keyboard test: Tab from the agent bar → filters → table → person card, no mouse.
 *
 * DONE WHEN
 *   - Asking "Who do I know at Microsoft?" in List view shows those rows first and marked;
 *     filters match the map; VoiceOver reads the table sensibly.
 *
 * Guide: §17.3
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowDown, ArrowUp } from 'lucide-react';
import type { Person, Reminder, Tag } from '@connectwork/shared';
import { tagColor } from '@/lib/colors';
import { formatDate } from '@/lib/dates';
import { matchesFilter, type FilterContext } from '@/lib/filters';
import { describeLastContact, isOverdue } from '@/lib/people';
import { cn } from '@/lib/utils';
import { useStore } from '@/store/useStore';

type SortKey = 'name' | 'ring' | 'tag' | 'company' | 'lastContact' | 'reminder';
interface Sort {
  key: SortKey;
  dir: 1 | -1;
}

const COLUMNS: Array<{ key: SortKey; label: string }> = [
  { key: 'name', label: 'Name' },
  { key: 'ring', label: 'Ring' },
  { key: 'tag', label: 'Tag' },
  { key: 'company', label: 'Company' },
  { key: 'lastContact', label: 'Last contact' },
  { key: 'reminder', label: 'Next reminder' },
];

/** Empty values always sort last, whichever direction (a column of blanks first is useless). */
function compareMaybe(a: string | undefined, b: string | undefined, dir: 1 | -1): number {
  if (!a && !b) return 0;
  if (!a) return 1;
  if (!b) return -1;
  return a.localeCompare(b) * dir;
}

interface Props {
  people: Person[];
  tags: Tag[];
  reminders: Reminder[];
  filterContext: FilterContext;
}

export function ListView({ people, tags, reminders, filterContext }: Props) {
  const filter = useStore((s) => s.filter);
  const highlightIds = useStore((s) => s.highlightIds);
  const selectedId = useStore((s) => s.selectedPersonId);
  const selectPerson = useStore((s) => s.selectPerson);
  const [sort, setSort] = useState<Sort>({ key: 'ring', dir: 1 });

  // Each person's earliest open reminder: one pass over reminders, not one search per row.
  const nextReminder = useMemo(() => {
    const out = new Map<string, Reminder>();
    for (const r of reminders) {
      if (r.done) continue;
      const cur = out.get(r.personId);
      if (!cur || r.dueDate < cur.dueDate) out.set(r.personId, r);
    }
    return out;
  }, [reminders]);

  // Steps 3–4. Filter like the map, then sort; highlighted (AI answer) rows first.
  const rows = useMemo(() => {
    const shown = people.filter((p) => matchesFilter(p, filter, filterContext));
    const byKey = (a: Person, b: Person): number => {
      const d = sort.dir;
      switch (sort.key) {
        case 'name':
          return a.name.localeCompare(b.name) * d;
        case 'ring':
          return (a.ring - b.ring) * d || a.name.localeCompare(b.name);
        case 'tag':
          return a.primaryTag.localeCompare(b.primaryTag) * d || a.name.localeCompare(b.name);
        case 'company':
          return compareMaybe(a.company, b.company, d) || a.name.localeCompare(b.name);
        case 'lastContact':
          return compareMaybe(a.lastContact, b.lastContact, d) || a.name.localeCompare(b.name);
        case 'reminder':
          return compareMaybe(nextReminder.get(a.id)?.dueDate, nextReminder.get(b.id)?.dueDate, d) || a.name.localeCompare(b.name);
      }
    };
    const hasHighlights = highlightIds.size > 0;
    return shown.sort((a, b) => (hasHighlights ? Number(highlightIds.has(b.id)) - Number(highlightIds.has(a.id)) : 0) || byKey(a, b));
  }, [people, filter, filterContext, sort, highlightIds, nextReminder]);

  // Step 6. Keyboard path: opening a card from the list moves focus INTO the card (otherwise
  // reaching it means tabbing past every row), and closing it returns focus to that row's name.
  const openedFrom = useRef<string | null>(null);
  const openFromKeyboard = (id: string) => {
    selectPerson(id);
    openedFrom.current = id;
    let tries = 0;
    const focusCard = () => {
      const card = document.getElementById('person-card');
      if (card) card.focus();
      else if (++tries < 30) requestAnimationFrame(focusCard); // the card renders once its live query loads
    };
    requestAnimationFrame(focusCard);
  };
  useEffect(() => {
    if (selectedId || !openedFrom.current) return;
    document.querySelector<HTMLButtonElement>(`[data-person-id="${CSS.escape(openedFrom.current)}"]`)?.focus();
    openedFrom.current = null;
  }, [selectedId]);

  const toggleSort = (key: SortKey) => setSort((s) => (s.key === key ? { key, dir: s.dir === 1 ? -1 : 1 } : { key, dir: 1 }));

  return (
    <div className="min-h-0 flex-1 overflow-auto px-4 pb-4">
      <p className="py-2 text-xs text-muted-foreground" aria-live="polite">
        {rows.length === people.length ? `${people.length} people` : `${rows.length} of ${people.length} people shown`}
        {highlightIds.size > 0 && ' · people in the answer come first'}
      </p>
      <table className="w-full border-collapse text-sm">
        <caption className="sr-only">Your network. Sortable: use the column header buttons.</caption>
        <thead className="sticky top-0 z-[1] bg-background">
          <tr className="border-b text-left">
            {COLUMNS.map((c) => {
              const active = sort.key === c.key;
              return (
                <th key={c.key} scope="col" aria-sort={active ? (sort.dir === 1 ? 'ascending' : 'descending') : 'none'} className="px-2 py-1.5 font-medium">
                  <button className="inline-flex items-center gap-1 rounded-sm hover:underline" onClick={() => toggleSort(c.key)}>
                    {c.label}
                    {active && (sort.dir === 1 ? <ArrowUp className="size-3" aria-hidden="true" /> : <ArrowDown className="size-3" aria-hidden="true" />)}
                  </button>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {rows.map((p) => {
            const highlighted = highlightIds.has(p.id);
            const drifting = filterContext.driftingIds.has(p.id);
            const reminder = nextReminder.get(p.id);
            const overdue = reminder ? isOverdue(reminder) : false;
            return (
              <tr
                key={p.id}
                aria-selected={highlighted || undefined}
                onClick={() => selectPerson(p.id)}
                className={cn(
                  'cursor-pointer border-b border-l-4 border-l-transparent hover:bg-muted/60',
                  highlighted && 'border-l-[var(--map-highlight)] bg-muted/40',
                  selectedId === p.id && 'bg-muted',
                )}
              >
                <th scope="row" className="px-2 py-1.5 text-left font-medium">
                  {/* Step 5. The row is clickable for the mouse; this button is the keyboard path. */}
                  <button
                    className="text-left underline-offset-2 hover:underline"
                    aria-current={selectedId === p.id ? 'true' : undefined}
                    data-person-id={p.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      openFromKeyboard(p.id);
                    }}
                  >
                    {p.name}
                  </button>
                  {highlighted && <span className="sr-only"> (in the answer)</span>}
                </th>
                <td className="px-2 py-1.5 tabular-nums">{p.ring}</td>
                <td className="px-2 py-1.5">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="inline-block size-2.5 shrink-0 rounded-full" style={{ background: tagColor(tags, p.primaryTag) }} aria-hidden="true" />
                    {p.primaryTag}
                  </span>
                </td>
                <td className="px-2 py-1.5">{p.company ?? <span className="text-muted-foreground">—</span>}</td>
                <td className={cn('px-2 py-1.5', drifting && 'text-destructive')}>
                  {describeLastContact(p)}
                  {drifting && ' · drifting'}
                </td>
                <td className={cn('px-2 py-1.5', overdue && 'text-destructive')}>
                  {reminder ? (
                    <>
                      {formatDate(reminder.dueDate)}
                      {overdue && ' · overdue'}
                      <span className="block truncate text-xs text-muted-foreground">{reminder.note}</span>
                    </>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {rows.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">Nobody matches this filter.</p>}
    </div>
  );
}
