/**
 * M5 — Network summary sent to the AI · done
 *
 * WHAT THIS ACHIEVES
 *   A compact text view of the network (≈ 70 lines / 2.5k tokens for 40 people) that
 *   the model reads reliably. Notes are deliberately LEFT OUT of queries — privacy by
 *   default (data minimization).
 *
 * HOW IT FITS
 *   AgentBar (M5), aiFlows (M6), WeeklyReview (M8) and the texting agent (M16) all send
 *   this. The server reads ids back out of the "P|" lines (routes/ai.ts summaryIds).
 *
 * STEPS
 *   1. field(v) = String(v ?? '') with pipes and newlines replaced by " / ", trimmed — so a
 *      name or company can never break the format.
 *   2. One line per person:
 *        P|id|name|ring|primaryTag|tags(comma-joined)|company|role|school|lastContact|metAt
 *   3. One line per ACCEPTED link whose two people both exist:  L|fromId|toId|label
 *   4. One line per UNDONE reminder whose person exists:          R|personId|dueDate|note
 *   5. Join with "\n".
 *   The server prompt (prompts.ts DATA_FORMAT) explains this format to the model — keep
 *   them in sync if you change it.
 *
 * DONE WHEN
 *   - lib/graphSummary.test.ts passes (unskip it): notes excluded, pipes escaped,
 *     only accepted links and open reminders.
 *
 * Guide: §9.2
 */
import type { Link, Person, Reminder } from '@connectwork/shared';

/**
 * Step 1. One safe field: pipes and newlines can't break the line format, and each value is
 * capped (M3-S2: the summary goes to the model, so its size and cost stay bounded).
 */
const field = (v: unknown, max = 300) =>
  String(v ?? '')
    .replace(/[|\r\n]+/g, ' / ')
    .trim()
    .slice(0, max);

export function buildSummary(people: Person[], links: Link[], reminders: Reminder[]): string {
  const ids = new Set(people.map((p) => p.id));
  const lines: string[] = [];
  // Step 2. Notes are deliberately NOT included: data minimization.
  for (const p of people) {
    lines.push(
      ['P', field(p.id, 64), field(p.name, 120), p.ring, field(p.primaryTag, 40), field(p.tags.join(','), 400), field(p.company), field(p.role), field(p.school), field(p.lastContact, 10), field(p.metAt, 10)].join('|'),
    );
  }
  // Step 3. Only links the user accepted, between people who still exist.
  for (const l of links) {
    if (l.status === 'accepted' && ids.has(l.fromId) && ids.has(l.toId)) lines.push(['L', l.fromId, l.toId, field(l.label, 200)].join('|'));
  }
  // Step 4. Only open reminders.
  for (const r of reminders) {
    if (!r.done && ids.has(r.personId)) lines.push(['R', r.personId, r.dueDate, field(r.note, 200)].join('|'));
  }
  return lines.join('\n');
}
