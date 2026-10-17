/**
 * M8 helper — POST /api/ai/draft · Owner: Person B · ~15 min
 *
 * WHAT THIS ACHIEVES
 *   A "Draft follow-up" button on any person card: one short, specific message
 *   using that person's notes and shared connections. Useful on its own and
 *   reused when the weekly review needs a fresh draft.
 *
 * HOW IT FITS
 *   PersonCard → api.ts aiPost('/draft', …) → this route → Gemini (DRAFT_SYSTEM)
 *   → editable textarea with Copy. Notes ARE sent here, because the user asked
 *   for help with this specific person.
 *
 * STEPS
 *   1. Implement registerDraft() with one structured() call (thinking 'low').
 *   2. parts: the person JSON, the shared connection names, and the purpose.
 *   3. Register it; add a PersonCard button "Draft follow-up" that shows the
 *      result in a textarea with a Copy button (navigator.clipboard.writeText).
 *
 * DONE WHEN
 *   - The draft mentions real shared context and is under ~80 words.
 *
 * Contract: DraftRequest / DraftResponse · Spec: SPEC.md §9.4
 */
import type { Hono } from 'hono';
import type { AppDeps } from '../app';

export function registerDraft(_routes: Hono, _deps: AppDeps): void {
  // TODO(M8) 1: structured(_routes, _deps, { path: '/draft', request: DraftRequest, response: DraftResponse,
  //   system: DRAFT_SYSTEM, thinking: 'low',
  //   parts: (b) => [{ text: `Person (JSON):\n${JSON.stringify(b.person)}\nShared connections: ${b.sharedConnections.join(', ') || 'none'}\nPurpose: ${b.purpose ?? 'catch up'}` }] });
  // TODO(M8) 2: register it from routes/ai.ts.
}
