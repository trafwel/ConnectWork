/**
 * M10 — ListView: the accessible twin of the map · Owner: Person A · ~45 min
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
 *   so AI answers and filters work identically in both views.
 *
 * STEPS
 *   1. TopBar: Map / List toggle (two buttons with aria-pressed) → setView.
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
import type { Person } from '@connectwork/shared';
import type { FilterContext } from '@/lib/filters';

export function ListView(_props: { people: Person[]; filterContext: FilterContext }) {
  // TODO(M10) steps 2–5
  return null;
}
