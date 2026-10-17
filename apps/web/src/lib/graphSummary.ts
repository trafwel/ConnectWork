/**
 * M5 — Network summary sent to the AI · done
 *
 * WHAT THIS ACHIEVES
 *   A compact text view of the network (≈ 70 lines / 2.5k tokens for 40 people)
 *   that the model can read reliably. Notes are deliberately left out of queries:
 *   privacy by default.
 *
 * HOW IT WAS BUILT
 *   P|id|name|ring|tag|tags|company|role|school|lastContact|metAt per person,
 *   L lines for accepted links, R lines for open reminders; pipes and newlines in
 *   fields are flattened so a name can't break the format.
 *
 * DONE WHEN
 *   - lib/graphSummary.test.ts passes (notes excluded, only accepted links and open reminders).
 *
 * Guide: §9.2
 */
import type { Link, Person, Reminder } from '@connectwork/shared';

/** Pipes and newlines would break the line format, so they are flattened. */
const field = (v: string | number | undefined) => String(v ?? '').replace(/[|\n\r]+/g, ' / ').trim();

/**
 * Compact text view of the network for the model (format described in the
 * server's prompts.ts). Notes are deliberately left out.
 */
export function buildSummary(people: Person[], links: Link[], reminders: Reminder[]): string {
  const ids = new Set(people.map((p) => p.id));
  const lines = people.map((p) =>
    [
      'P',
      p.id,
      field(p.name),
      p.ring,
      field(p.primaryTag),
      field(p.tags.join(',')),
      field(p.company),
      field(p.role),
      field(p.school),
      p.lastContact ?? '',
      p.metAt ?? '',
    ].join('|'),
  );
  for (const l of links) {
    if (l.status === 'accepted' && ids.has(l.fromId) && ids.has(l.toId)) lines.push(['L', l.fromId, l.toId, field(l.label)].join('|'));
  }
  for (const r of reminders) {
    if (!r.done && ids.has(r.personId)) lines.push(['R', r.personId, r.dueDate, field(r.note)].join('|'));
  }
  return lines.join('\n');
}
