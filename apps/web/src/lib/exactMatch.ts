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
