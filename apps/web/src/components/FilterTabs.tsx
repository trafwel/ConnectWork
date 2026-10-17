/**
 * M7 — FilterTabs: one-click views of the network · Owner: Person A · ~25 min
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

export function FilterTabs(_props: { counts: Record<string, number> }) {
  // TODO(M7) steps 2–3
  return null;
}
