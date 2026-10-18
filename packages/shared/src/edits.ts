/**
 * Oct 18 — the guardrail for search-bar edits, shared by the server (before replying) and the
 * browser (before showing the review sheet), like every other AI response.
 *
 * The model's edits are only proposals; this keeps the ones that are well formed and point at
 * people who exist. Anything else is dropped silently, the same way invented person ids are
 * dropped from answers.
 */
import type { NetworkEdit } from './schemas';

const NEEDS: Record<NetworkEdit['op'], number> = {
  add_link: 2,
  remove_link: 2,
  remove_suggested_links: 0,
  set_ring: 1,
  set_tag: 1,
  add_person: 0,
  remove_person: 1,
};

export function cleanEdits(edits: readonly NetworkEdit[], known: ReadonlySet<string>): NetworkEdit[] {
  const out: NetworkEdit[] = [];
  const seen = new Set<string>();
  for (const e of edits) {
    const ids = [...new Set(e.personIds)];
    if (ids.length !== NEEDS[e.op] || !ids.every((id) => known.has(id))) continue;
    if (e.op === 'set_ring' && !e.ring) continue;
    if (e.op === 'set_tag' && !e.tag) continue;
    if (e.op === 'add_person' && !e.name) continue;
    // Order doesn't matter for a pair; the same change twice is one change.
    const key = `${e.op}|${e.op.endsWith('_link') ? [...ids].sort().join(',') : ids.join(',')}|${e.ring ?? ''}|${e.tag ?? ''}|${e.name?.toLowerCase() ?? ''}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ ...e, personIds: ids });
  }
  return out;
}
