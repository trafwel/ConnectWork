/**
 * M7 — FilterTabs: one-click views of the network · done
 *
 * WHAT THIS ACHIEVES
 *   A left rail of views — All, Work, School, Friends, Family, Clubs, Due,
 *   Drifting — so the user can switch what they focus on in one click. The map
 *   fades everyone else instead of removing them, so nobody "jumps" and the
 *   user keeps their bearings. Due and Drifting are the entry points to the
 *   planning features.
 *
 * HOW IT FITS
 *   useStore.filter is already read by RingMap (lib/filters.ts matchesFilter).
 *   App.tsx already computes filterContext.dueIds; driftingIds is filled in M10.
 *   This component only reads counts and calls setFilter.
 *
 * STEPS
 *   1. Props: { counts: Record<string, number> } (computed in App.tsx: people
 *      per primary tag, dueIds.size, driftingIds.size).
 *   2. Render <nav aria-label="Filters" className="w-44 shrink-0 border-r bg-background p-2">
 *      with one real <button aria-pressed={active}> per filter: a color dot
 *      (tagColor), the label, and the count on the right.
 *   3. onClick → setFilter(value) and setHighlights([]) (AI highlights override
 *      filters in RingMap, so clear them).
 *   4. App.tsx: place <FilterTabs /> to the left of <main>.
 *   5. When the filter is 'due', App renders <RemindersPanel /> on the right.
 *
 * DONE WHEN
 *   - Each tab fades non-matching people without moving anyone; counts are right;
 *     Tab + Enter works.
 *
 * Guide: §13.2
 */

import { useLiveQuery } from 'dexie-react-hooks';
import { CircleDot, Flag, Hourglass } from 'lucide-react';
import { db } from '@/db/db';
import { tagColor } from '@/lib/colors';
import { cn } from '@/lib/utils';
import { useStore, type Filter } from '@/store/useStore';

const TAG_TABS = ['Work', 'School', 'Friends', 'Family', 'Clubs'];

export function FilterTabs({ counts }: { counts: Record<string, number> }) {
  const filter = useStore((s) => s.filter);
  const setFilter = useStore((s) => s.setFilter);
  const setWeeklyOpen = useStore((s) => s.setWeeklyOpen);
  const selectPerson = useStore((s) => s.selectPerson);
  const setHighlights = useStore((s) => s.setHighlights);
  const tags = useLiveQuery(() => db.tags.toArray(), []);

  // "LinkedIn" only while there are unsorted imports, so it doesn't clutter the rail otherwise.
  const tagTabs = (counts.LinkedIn ?? 0) > 0 ? [...TAG_TABS, 'LinkedIn'] : TAG_TABS;
  const tabs: Array<{ value: Filter; label: string; icon: React.ReactNode }> = [
    { value: 'all', label: 'All', icon: <CircleDot className="size-3.5" aria-hidden="true" /> },
    ...tagTabs.map((t) => ({
      value: t as Filter,
      label: t === 'LinkedIn' ? 'LinkedIn (unsorted)' : t,
      icon: <span className="inline-block size-2.5 rounded-full" style={{ background: tagColor(tags, t) }} aria-hidden="true" />,
    })),
    { value: 'due', label: 'Due', icon: <Flag className="size-3.5" aria-hidden="true" /> },
    { value: 'drifting', label: 'Drifting', icon: <Hourglass className="size-3.5" aria-hidden="true" /> },
  ];

  // Step 2
  return (
    <nav aria-label="Filters" className="min-h-0 flex-1 space-y-0.5 overflow-y-auto p-2">
      {tabs.map((t) => {
        const active = filter === t.value;
        return (
          <button
            key={t.value}
            type="button"
            aria-pressed={active}
            // Step 3. AI highlights win over filters in RingMap, so a filter click clears them.
            onClick={() => {
              setFilter(t.value);
              setHighlights([]);
              // Bug pass (Oct 18): the open weekly review ranks above the Due panel, so clicking Due
              // showed nothing new. Clicking Due is a request for that panel: close what hides it.
              if (t.value === 'due') {
                setWeeklyOpen(false);
                selectPerson(null);
              }
            }}
            className={cn(
              'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors',
              active ? 'bg-muted font-medium text-foreground' : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
            )}
          >
            {t.icon}
            <span className="flex-1 truncate">{t.label}</span>
            <span className="text-xs tabular-nums">{counts[t.value] ?? 0}</span>
          </button>
        );
      })}
    </nav>
  );
}
