/**
 * M8 — POST /api/ai/weekly-review · done
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
 *      (M8 review, added: every action must match a candidate of the same kind and
 *      people; reminder dates must be real and today…+30 days; no duplicates.)
 *   3. Register it in routes/ai.ts; add a mocked-generate test for step 2.
 *   4. Live check on the seed: John Park appears (overdue follow-up + drifting).
 *
 * DONE WHEN
 *   - ≤ 6 actions, each grounded in a candidate, drafts are short and specific.
 *
 * Contract: WeeklyReviewRequest / WeeklyReviewResponse · Guide: §15
 */
import type { Hono } from 'hono';
import { WeeklyReviewRequest, WeeklyReviewResponse, type Candidate } from '@connectwork/shared';
import type { AppDeps } from '../app';
import { WEEKLY_SYSTEM } from '../prompts';
import { requestToday, structured, summaryIds } from './structured';

const DAY_MS = 86_400_000;
const peopleOf = (c: Candidate): string[] =>
  c.kind === 'accept_link' ? [c.fromId, c.toId] : c.kind === 'intro' ? [...c.personIds] : [c.personId];
const sameSet = (a: string[], b: string[]) => a.length === b.length && a.every((x) => b.includes(x));

/** A real calendar date from `today` up to 30 days later (the model sometimes writes past dates). */
function okReminderDate(date: string | undefined, today: string): boolean {
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const [y, m, d] = date.split('-').map(Number);
  const t = new Date(y!, m! - 1, d!);
  if (t.getFullYear() !== y || t.getMonth() !== m! - 1 || t.getDate() !== d) return false; // e.g. 2026-02-30
  const [ty, tm, td] = today.split('-').map(Number);
  const diff = Math.round((t.getTime() - new Date(ty!, tm! - 1, td!).getTime()) / DAY_MS);
  return diff >= 0 && diff <= 30;
}

/** Guardrails, exported for tests: the model chooses among candidates; it can't add tasks. */
export function guardWeekly(res: WeeklyReviewResponse, body: WeeklyReviewRequest, today: string): WeeklyReviewResponse {
  const known = summaryIds(body.summary);
  const links = new Map(body.candidates.flatMap((c) => (c.kind === 'accept_link' ? [[c.linkId, c] as const] : [])));
  const seen = new Set<string>();
  const actions = res.actions.flatMap((a) => {
    let personIds = [...new Set(a.personIds)];
    if (a.kind === 'accept_link') {
      const link = a.linkId ? links.get(a.linkId) : undefined;
      if (!link) return [];
      personIds = [link.fromId, link.toId]; // trust our candidate, not the model's copy
    } else if (!body.candidates.some((c) => c.kind === a.kind && sameSet(peopleOf(c), personIds))) {
      return [];
    }
    if (!personIds.every((id) => known.has(id))) return [];
    const key = `${a.kind}|${[...personIds].sort().join(',')}`;
    if (seen.has(key)) return [];
    seen.add(key);
    const { reminderDate, linkId, ...rest } = a;
    return [
      {
        ...rest,
        personIds,
        ...(okReminderDate(reminderDate, today) ? { reminderDate } : {}),
        ...(a.kind === 'accept_link' ? { linkId } : {}),
      },
    ];
  });
  return { headline: res.headline, actions };
}

export function registerWeeklyReview(routes: Hono, deps: AppDeps): void {
  structured(routes, deps, {
    path: '/weekly-review',
    request: WeeklyReviewRequest,
    response: WeeklyReviewResponse,
    system: WEEKLY_SYSTEM,
    thinking: 'medium', // planning across candidates, not a lookup
    // The body's `today` gets the same plausibility check as the x-client-date header.
    parts: (b) => [{ text: `Today is ${requestToday(b.today)}.\n\nNetwork:\n${b.summary}\n\nCandidates (JSON):\n${JSON.stringify(b.candidates)}` }],
    post: (res, b) => guardWeekly(res, b, requestToday(b.today)),
  });
}
