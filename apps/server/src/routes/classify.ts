/**
 * M6 — POST /api/ai/classify · Owner: Person B · ~30 min
 *
 * WHAT THIS ACHIEVES
 *   After someone imports 100+ LinkedIn contacts, they all land in the gray
 *   outer ring. This endpoint lets the AI propose a ring and tags for each one
 *   (with a one-line reason), so one click turns the gray band into colored
 *   clusters. It is the "automation" half of our Cook Smarter pitch.
 *
 * HOW IT FITS
 *   Browser (lib/aiFlows.ts → sortWithAi) sends ≤150 people per call →
 *   this route → Gemini (CLASSIFY_SYSTEM) → guardrails below → the browser
 *   shows the suggestions in ReviewSheet → only accepted ones are written.
 *
 * STEPS
 *   1. Finish routes/structured.ts (step R) first.
 *   2. Implement registerClassify() with ONE structured() call (TODOs below).
 *   3. In routes/ai.ts, inside aiRoutes(), call registerClassify(routes, deps).
 *   4. Add a test to routes/ai.test.ts with a mocked generate that returns:
 *      an unknown id, a ring-1 item, and a tag not in the allowed list.
 *      Assert: unknown id dropped, ring 1 → 2, unknown tag dropped
 *      (and an item whose primaryTag is unknown is dropped entirely).
 *   5. Live check (once!): import demo/Connections.csv, run Sort with AI on
 *      ~20 people, read the reasons. Tune CLASSIFY_SYSTEM if they're vague.
 *
 * DONE WHEN
 *   - The new test passes and the route returns sensible rings/tags/reasons.
 *   - The model can never put an imported contact in ring 1 (enforced in code).
 *
 * Contract: ClassifyRequest / ClassifyResponse in @connectwork/shared
 * Guide: docs/IMPLEMENTATION_GUIDE.md §12.1–12.3
 */
import type { Hono } from 'hono';
import type { AppDeps } from '../app';

export function registerClassify(_routes: Hono, _deps: AppDeps): void {
  // TODO(M6) 1: structured(_routes, _deps, {
  //   path: '/classify', request: ClassifyRequest, response: ClassifyResponse,
  //   system: CLASSIFY_SYSTEM, thinking: 'low',
  // TODO(M6) 2: parts: (b) => [{ text: `Allowed tags: ${b.tags.join(', ')}\nAbout the user: ${b.userContext ?? 'unknown'}\n\nPeople (JSON):\n${JSON.stringify(b.people)}` }],
  // TODO(M6) 3: post: guardrails in CODE, not just the prompt:
  //   const ids = new Set(b.people.map((p) => p.id)); const tags = new Set(b.tags);
  //   keep items whose id is in ids AND primaryTag is in tags;
  //   map ring 1 → 2; filter item.tags to allowed tags.
  // TODO(M6) 4: register it from routes/ai.ts.
}
