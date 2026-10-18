/**
 * M2 — Filter matching · done (used by FilterTabs in M7 and ListView in M10)
 *
 * WHAT THIS ACHIEVES
 *   One rule for "does this person match the current view", shared by the map and
 *   the list view so both always agree.
 *
 * STEPS
 *   1. 'all' → true.
 *   2. 'due' → ctx.dueIds.has(p.id); 'drifting' → ctx.driftingIds.has(p.id)
 *      (App.tsx precomputes both sets once per render, not per person).
 *   3. Any other value is a tag name → p.primaryTag === filter || p.tags.includes(filter).
 *
 * Guide: §6.2, §13.2
 */
import type { Person } from '@connectwork/shared';
import type { Filter } from '@/store/useStore';

export interface FilterContext {
  dueIds: Set<string>;
  driftingIds: Set<string>;
  /** M7: people with an overdue reminder (their map flag turns orange-red). */
  overdueIds?: Set<string>;
}

export function matchesFilter(p: Person, filter: Filter, ctx: FilterContext): boolean {
  if (filter === 'all') return true;
  if (filter === 'due') return ctx.dueIds.has(p.id);
  if (filter === 'drifting') return ctx.driftingIds.has(p.id);
  return p.primaryTag === filter || p.tags.includes(filter); // any other value is a tag name
}
