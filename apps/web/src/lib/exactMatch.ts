/**
 * M5 — Exact company/school matches · Owner: Person B · ~20 min (added after live testing)
 *
 * WHAT THIS ACHIEVES
 *   Guarantees nobody is missed when a question names a company or school. In a
 *   155-person database the model found 10 of 11 Microsoft people even after a prompt
 *   fix; plain code finds all 11. The model writes the sentence, code makes the list
 *   complete (lesson 4 in guide §10).
 *
 * HOW IT FITS
 *   AgentBar unions these ids with the model's ids before highlighting.
 *
 * STEPS
 *   1. norm(s) = lowercase, every run of non-alphanumerics → one space, trimmed.
 *   2. q = ` ${norm(question)} ` (padded with spaces so we match WHOLE words).
 *   3. Collect every company and school value v (normalized, length ≥ 3) where
 *      q.includes(` ${v} `) — "Who knows Googleplex trivia?" must NOT match Google.
 *   4. Return the ids of people whose normalized company or school is in that set.
 *
 * DONE WHEN
 *   - lib/exactMatch.test.ts passes (unskip it).
 *
 * Guide: §9.6, §10
 */
import type { Person } from '@connectwork/shared';

export function exactMatches(_question: string, _people: Person[]): string[] {
  // TODO(M5) steps 1–4
  return [];
}
