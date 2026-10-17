/**
 * M2 — Filter matching · ~10 min (used by FilterTabs in M7 and ListView in M10)
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
}

export function matchesFilter(_p: Person, _filter: Filter, _ctx: FilterContext): boolean {
  // TODO(M2) steps 1–3
  return true;
}
