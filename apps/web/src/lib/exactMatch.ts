/**
 * M5 — Exact company/school matches · done (grounding check added in the M5 review)
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
 *   5. (M5 review) groundModelIds: when the question names a company/school, keep a MODEL
 *      id only if that person's own company, school, role or tags mention it. Live test:
 *      "Who went to University of Washington?" → the model added someone from Seattle
 *      University; a role like "former Microsoft intern" still counts.
 *
 * DONE WHEN
 *   - lib/exactMatch.test.ts passes (unskip it).
 *
 * Guide: §9.6, §10
 */
import type { Person } from '@connectwork/shared';

// Step 1
const norm = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

/** Companies and schools (normalized) that the question names, as whole words. */
function namedEntities(question: string, people: Person[]): Set<string> {
  const q = ` ${norm(question)} `;
  const named = new Set<string>();
  for (const p of people) {
    for (const v of [p.company, p.school]) {
      const n = v ? norm(v) : '';
      if (n.length >= 3 && q.includes(` ${n} `)) named.add(n);
    }
  }
  return named;
}

/**
 * Step 5. Keeps a model-suggested id only if, when the question names a company or school,
 * the person's own data mentions it somewhere. Questions naming nothing pass through.
 */
export function groundModelIds(question: string, people: Person[], modelIds: string[]): string[] {
  const named = namedEntities(question, people);
  if (!named.size) return modelIds;
  const byId = new Map(people.map((p) => [p.id, p]));
  return modelIds.filter((id) => {
    const p = byId.get(id);
    if (!p) return false;
    const text = ` ${norm([p.company, p.school, p.role, ...p.tags].filter(Boolean).join(' '))} `;
    return [...named].some((n) => text.includes(` ${n} `));
  });
}

export function exactMatches(question: string, people: Person[]): string[] {
  // Step 2. Padded with spaces so only WHOLE words match ("googleplex" isn't "google").
  const q = ` ${norm(question)} `;
  // Step 3
  const named = new Set<string>();
  for (const p of people) {
    for (const v of [p.company, p.school]) {
      const n = v ? norm(v) : '';
      if (n.length >= 3 && q.includes(` ${n} `)) named.add(n);
    }
  }
  if (!named.size) return [];
  // Step 4
  return people.filter((p) => named.has(norm(p.company ?? '')) || named.has(norm(p.school ?? ''))).map((p) => p.id);
}

/**
 * M16: who an answer is about, decided by CODE (shared by Ask Connectwork and the texting agent,
 * so a texted answer highlights exactly what a typed one would):
 *   - "lost touch" → the exact drift rule, not the model's list;
 *   - otherwise the model's ids that exist locally and are grounded in the named company/school,
 *     plus every exact company/school match.
 */
export function answerIds(question: string, people: Person[], modelIds: string[], filterHint: 'none' | 'due' | 'drifting', isDrifting: (p: Person) => boolean): string[] {
  const local = new Set(people.map((p) => p.id));
  const known = modelIds.filter((id) => local.has(id));
  if (filterHint === 'drifting') return people.filter(isDrifting).map((p) => p.id);
  return [...new Set([...groundModelIds(question, people, known), ...exactMatches(question, people)])];
}

