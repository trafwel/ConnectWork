/**
 * M6 — POST /api/ai/classify · done
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
 *   2. registerClassify() is one structured() call.
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
import { ClassifyRequest, ClassifyResponse } from '@connectwork/shared';
import type { AppDeps } from '../app';
import { CLASSIFY_SYSTEM } from '../prompts';
import { structured } from './structured';

export function registerClassify(routes: Hono, deps: AppDeps): void {
  structured(routes, deps, {
    path: '/classify',
    request: ClassifyRequest,
    response: ClassifyResponse,
    system: CLASSIFY_SYSTEM,
    thinking: 'low',
    parts: (b) => [
      {
        text:
          `Allowed tags: ${b.tags.join(', ')}\n` +
          `About the user: ${b.userContext?.trim() || 'unknown'}\n\n` +
          `People (JSON):\n${JSON.stringify(b.people)}`,
      },
    ],
    // Guardrails in code, not just the prompt: only known people, only allowed
    // tags, and an imported contact can never be placed in ring 1.
    post: (res, b) => {
      const ids = new Set(b.people.map((p) => p.id));
      const tags = new Set(b.tags);
      const seen = new Set<string>();
      return {
        items: res.items
          .filter((i) => ids.has(i.id) && tags.has(i.primaryTag) && !seen.has(i.id) && seen.add(i.id))
          .map((i) => ({ ...i, ring: i.ring === 1 ? 2 : i.ring, tags: i.tags.filter((t) => tags.has(t)) })),
      };
    },
  });
}
