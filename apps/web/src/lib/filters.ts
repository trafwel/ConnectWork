/**
 * M2 — Filter matching · done (used by FilterTabs in M7)
 *
 * WHAT THIS ACHIEVES
 *   One rule for "does this person match the current view", shared by the map and
 *   (in M10) the list view, so both always agree.
 *
 * HOW IT WAS BUILT
 *   'all' matches everyone; 'due' and 'drifting' use precomputed id sets from
 *   App.tsx; any other value matches the primary tag or any extra tag.
 *
 * Guide: §6.2, §13.2
 */
import type { Person } from '@connectwork/shared';
import type { Filter } from '@/store/useStore';

export interface FilterContext {
  dueIds: Set<string>;
  driftingIds: Set<string>;
}

export function matchesFilter(p: Person, filter: Filter, ctx: FilterContext): boolean {
  if (filter === 'all') return true;
  if (filter === 'due') return ctx.dueIds.has(p.id);
  if (filter === 'drifting') return ctx.driftingIds.has(p.id);
  return p.primaryTag === filter || p.tags.includes(filter);
}
