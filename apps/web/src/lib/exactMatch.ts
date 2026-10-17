/**
 * M5 — Exact company/school matches · done (added after live testing)
 *
 * WHAT THIS ACHIEVES
 *   Guarantees nobody is missed when a question names a company or school. In the
 *   155-person database the model found 10 of 11 Microsoft people even after a
 *   prompt fix; plain code finds all 11. The model writes the sentence, code makes
 *   the list complete — lesson 4 in guide §10.
 *
 * HOW IT FITS
 *   AgentBar unions these ids with the model's ids before highlighting.
 *
 * DONE WHEN
 *   - lib/exactMatch.test.ts passes (any case, multi-word names, whole words only).
 *
 * Guide: §9.6, §10
 */
import type { Person } from '@connectwork/shared';

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

/**
 * People whose company or school is named in the question. Language models
 * miss rows in long lists; exact field lookups shouldn't depend on that.
 * Values shorter than 3 characters are ignored to avoid accidental hits.
 */
export function exactMatches(question: string, people: Person[]): string[] {
  const q = ` ${norm(question)} `;
  const named = new Set<string>();
  for (const p of people) {
    for (const value of [p.company, p.school]) {
      if (!value) continue;
      const v = norm(value);
      if (v.length >= 3 && q.includes(` ${v} `)) named.add(v);
    }
  }
  if (!named.size) return [];
  return people.filter((p) => [p.company, p.school].some((v) => v && named.has(norm(v)))).map((p) => p.id);
}
