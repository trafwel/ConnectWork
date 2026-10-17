/**
 * M5 — Network summary sent to the AI · Owner: Person B · ~30 min
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

export function buildSummary(_people: Person[], _links: Link[], _reminders: Reminder[]): string {
  // TODO(M5) steps 1–5
  return '';
}
