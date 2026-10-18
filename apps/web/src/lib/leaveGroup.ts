/**
 * Oct 18 — where someone goes when they leave a group from their card.
 *
 * Back to the group they were in before (previousTag), if it still exists and isn't the group
 * they're leaving; otherwise a sensible built-in group: Work if they have a company, else
 * Friends. Pure, so it's tested on its own (leaveGroup.test.ts); db/actions.ts does the writing.
 */
import type { Person } from '@connectwork/shared';

export function leaveDestination(person: Pick<Person, 'primaryTag' | 'previousTag' | 'company'>, existingGroups: readonly string[]): string {
  const prev = person.previousTag;
  if (prev && prev !== person.primaryTag && existingGroups.includes(prev)) return prev;
  return person.company ? 'Work' : 'Friends';
}
