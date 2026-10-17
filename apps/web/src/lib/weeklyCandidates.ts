/**
 * M8 — Weekly review candidates, computed in the browser · Owner: Person B · ~30 min
 *
 * WHAT THIS ACHIEVES
 *   The AI shouldn't hunt through 150 people to decide what matters this week —
 *   that's slow, costly and it can miss things (we saw it miss 1 of 11 in M5).
 *   Plain code builds an exact shortlist; the AI only chooses among it and
 *   writes the words. This is lesson 4 from live testing: exact work in code,
 *   judgement and language in the model.
 *
 * HOW IT FITS
 *   WeeklyReview.tsx → weeklyCandidates(people, links, reminders) → sent with
 *   the summary to /api/ai/weekly-review (Candidate type from @connectwork/shared).
 *
 * STEPS
 *   1. follow_up: every undone reminder due within 7 days or overdue
 *      (dueReminders in lib/people.ts) → { kind, personId, reminderId, dueDate, note }.
 *   2. reconnect: ring 1–2 people sorted by driftLevel (lib/drift.ts, M10) descending,
 *      top 10 with driftLevel > 0 → { kind, personId, daysSinceContact }.
 *      Until M10 lands: ring 1 > 90 days or ring 2 > 180 days since lastContact.
 *   3. accept_link: links with status 'suggested' → { kind, linkId, fromId, toId, label }.
 *   4. intro: people tagged 'intro' who share a company or school with another
 *      person they're not linked to → { kind, personIds: [a, b], shared: 'Microsoft' }.
 *      At most 5.
 *   5. Cap the total at 40 (the schema max), in the order above.
 *   6. Test lib/weeklyCandidates.test.ts with materializeSeed(seed, fixedDate):
 *      John Park appears as BOTH follow_up and reconnect.
 *
 * DONE WHEN
 *   - The test passes and the list is deterministic for a fixed date.
 *
 * Guide: §15.1
 */
import type { Candidate, Link, Person, Reminder } from '@connectwork/shared';

export function weeklyCandidates(_people: Person[], _links: Link[], _reminders: Reminder[], _now: Date = new Date()): Candidate[] {
  // TODO(M8) steps 1–5
  throw new Error('TODO(M8): weeklyCandidates is not implemented yet');
}
