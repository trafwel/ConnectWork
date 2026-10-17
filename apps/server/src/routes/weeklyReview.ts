/**
 * M8 — POST /api/ai/weekly-review · Owner: Person B · ~40 min (route only)
 *
 * WHAT THIS ACHIEVES
 *   Our Cook Smarter centerpiece. One "Review my week" button: the app hands
 *   the AI a shortlist (due follow-ups, people drifting away, pending link
 *   suggestions, intro opportunities), the AI picks the 5–6 most valuable,
 *   explains why, and drafts the messages. The user approves; the app does the
 *   work (reminders, accepted links, copied drafts). An agent that finishes
 *   tasks, not just answers questions.
 *
 * HOW IT FITS
 *   lib/weeklyCandidates.ts computes candidates in the browser (cheap, exact) →
 *   components/WeeklyReview.tsx sends { summary, candidates, today } →
 *   this route → Gemini (WEEKLY_SYSTEM, thinking 'medium') → guardrails →
 *   the panel renders action cards with Approve / Approve all.
 *
 * STEPS
 *   1. Implement registerWeeklyReview() with one structured() call.
 *   2. Guardrails in post(): drop actions whose personIds aren't all in the
 *      summary; drop accept_link actions whose linkId isn't one of the
 *      candidates' linkIds; drop reminderDate values that aren't YYYY-MM-DD.
 *   3. Register it in routes/ai.ts; add a mocked-generate test for step 2.
 *   4. Live check on the seed: John Park appears (overdue follow-up + drifting).
 *
 * DONE WHEN
 *   - ≤ 6 actions, each grounded in a candidate, drafts are short and specific.
 *
 * Contract: WeeklyReviewRequest / WeeklyReviewResponse · Guide: §15
 */
import type { Hono } from 'hono';
import type { AppDeps } from '../app';

export function registerWeeklyReview(_routes: Hono, _deps: AppDeps): void {
  // TODO(M8) 1: structured(_routes, _deps, {
  //   path: '/weekly-review', request: WeeklyReviewRequest, response: WeeklyReviewResponse,
  //   system: WEEKLY_SYSTEM, thinking: 'medium',
  // TODO(M8) 2: parts: (b) => [{ text: `Today is ${b.today}.\n\nNetwork:\n${b.summary}\n\nCandidates (JSON):\n${JSON.stringify(b.candidates)}` }],
  // TODO(M8) 3: post: guardrails from step 2 in the header.
  // TODO(M8) 4: register it from routes/ai.ts.
}
