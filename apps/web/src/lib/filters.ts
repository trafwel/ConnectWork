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
