/**
 * M8 — Weekly review candidates, computed in the browser · done
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
 *   2. reconnect: ring 1–2 people sorted by driftLevel (lib/drift.ts) descending,
 *      top 10 with driftLevel > 0 → { kind, personId, daysSinceContact }.
 *   3. accept_link: links with status 'suggested' → { kind, linkId, fromId, toId, label }.
 *   4. intro: people tagged 'intro' who share a company or school with another
 *      person they're not linked to → { kind, personIds: [a, b], shared: 'Microsoft' }.
 *      At most 5; one per intro-tagged person (their closest match by ring, then name).
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
import { daysSince } from './dates';
import { driftLevel } from './drift';
import { dueReminders } from './people';

/** The schema's maximum (WeeklyReviewRequest.candidates). */
const MAX_CANDIDATES = 40;
const MAX_RECONNECT = 10;
const MAX_INTRO = 5;

const norm = (s?: string) => (s ?? '').trim().toLowerCase();
const byRingThenName = (a: Person, b: Person) => a.ring - b.ring || a.name.localeCompare(b.name);

export function weeklyCandidates(people: Person[], links: Link[], reminders: Reminder[], now: Date = new Date()): Candidate[] {
  const byId = new Map(people.map((p) => [p.id, p]));

  // Step 1. Every undone reminder due within 7 days or overdue (oldest first).
  const followUps: Candidate[] = dueReminders(reminders, 7, now)
    .filter((r) => byId.has(r.personId))
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate) || a.id.localeCompare(b.id))
    .map((r) => ({ kind: 'follow_up', personId: r.personId, reminderId: r.id, dueDate: r.dueDate, note: r.note }));

  // Step 2. Close people drifting away, most drifted first (ties by name, so the order is stable).
  const reconnect: Candidate[] = people
    .filter((p) => p.ring !== 3 && p.lastContact && driftLevel(p, now) > 0)
    .sort((a, b) => driftLevel(b, now) - driftLevel(a, now) || a.name.localeCompare(b.name))
    .slice(0, MAX_RECONNECT)
    .map((p) => ({ kind: 'reconnect', personId: p.id, daysSinceContact: daysSince(p.lastContact!, now) }));

  // Step 3. Suggested links waiting for a decision (both people must still exist).
  const acceptLinks: Candidate[] = links
    .filter((l) => l.status === 'suggested' && byId.has(l.fromId) && byId.has(l.toId))
    .map((l) => ({ kind: 'accept_link', linkId: l.id, fromId: l.fromId, toId: l.toId, label: l.label }));

  // Step 4. For each intro-tagged person: their closest unlinked match by company or school.
  const linked = new Set(links.map((l) => `${l.fromId}|${l.toId}`));
  const isLinked = (a: string, b: string) => linked.has(`${a}|${b}`) || linked.has(`${b}|${a}`);
  const intros: Candidate[] = [];
  for (const a of people.filter((p) => p.tags.includes('intro')).sort(byRingThenName)) {
    if (intros.length >= MAX_INTRO) break;
    const shares = (b: Person) => {
      if (norm(a.company) && norm(a.company) === norm(b.company)) return a.company!;
      if (norm(a.school) && norm(a.school) === norm(b.school)) return a.school!;
      return null;
    };
    const match = people.filter((b) => b.id !== a.id && !isLinked(a.id, b.id) && shares(b)).sort(byRingThenName)[0];
    if (match) intros.push({ kind: 'intro', personIds: [a.id, match.id], shared: shares(match)! });
  }

  // Step 5. In this order, capped at the schema maximum.
  return [...followUps, ...reconnect, ...acceptLinks, ...intros].slice(0, MAX_CANDIDATES);
}
