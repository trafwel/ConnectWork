/**
 * M5 — AI routes (POST /api/ai/query) · done (refactored in step R)
 *
 * WHAT THIS ACHIEVES
 *   Plain-English questions about your network ("Who do I know at Microsoft?")
 *   answered in a sentence, with the ids of everyone the answer is about, so the
 *   map can highlight them.
 *
 * HOW IT FITS
 *   Browser AgentBar → POST /api/ai/query { question, summary } → validate →
 *   demo cache → Gemini (QUERY_SYSTEM, thinking low) → guardrails → reply.
 *   Since step R the handler is a structured() configuration; M6+ routes register here.
 *
 * HOW IT WAS BUILT
 *   1. Validate the body with QueryRequest (400 on failure).
 *   2. Cache hit → return it.
 *   3. callStructured with today's date + the summary + the question.
 *   4. Guardrail in code: drop any id that isn't a P line in the summary, and
 *      de-duplicate — the model can never highlight someone who doesn't exist.
 *   5. Errors → friendly message + status; logged as "AI <code> on <route>" without the body.
 *
 * DONE WHEN
 *   - routes/ai.test.ts passes (mocked Gemini) and the live questions in §10 work.
 *
 * Guide: §9.5
 */
import { Hono } from 'hono';
import { QueryRequest, QueryResponse } from '@connectwork/shared';
import type { AppDeps } from '../app';
import { QUERY_SYSTEM } from '../prompts';
import { registerClassify } from './classify';
import { registerLinks } from './links';
import { structured } from './structured';
import { summaryIds } from './summary';

// Re-exported for existing imports (tests); lives in summary.ts to avoid an import cycle with links.ts.
export { summaryIds };

export function aiRoutes(deps: AppDeps) {
  const routes = new Hono();

  structured(routes, deps, {
    path: '/query',
    request: QueryRequest,
    response: QueryResponse,
    system: QUERY_SYSTEM,
    thinking: 'low',
    badRequest: 'Expected { question, summary }',
    parts: (b, today) => [{ text: `Today is ${today}.\n\nNetwork:\n${b.summary}\n\nQuestion: ${b.question}` }],
    // Guardrail: the model can never highlight someone who isn't in the data.
    post: (res, b) => {
      const known = summaryIds(b.summary);
      return { ...res, personIds: [...new Set(res.personIds)].filter((id) => known.has(id)) };
    },
  });

  registerClassify(routes, deps);
  registerLinks(routes, deps);

  return routes;
}
