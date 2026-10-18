/**
 * M5 — AI routes (POST /api/ai/query) · done; step R moved it onto structured(); M6 registers classify + links
 *
 * WHAT THIS ACHIEVES
 *   Plain-English questions about your network ("Who do I know at Microsoft?")
 *   answered in a sentence, with the ids of everyone the answer is about, so the
 *   map can highlight them.
 *
 * HOW IT FITS
 *   Browser AgentBar → POST /api/ai/query { question, summary } → validate →
 *   demo cache → Gemini (QUERY_SYSTEM, thinking 'low') → guardrails → reply.
 *   Mounted from app.ts (M5 step 3). Later (step R) this handler becomes a
 *   structured() configuration and M6+ routes register here.
 *
 * STEPS
 *   1. summaryIds(summary): the ids from every line starting with "P|" (field 1).
 *   2. aiRoutes(deps): const routes = new Hono(); routes.post('/query', async (c) => { … }); return routes.
 *   3. Validate: QueryRequest.safeParse(await c.req.json().catch(() => null));
 *      failure → c.json({ error: 'bad_request', message: 'Expected { question, summary }' }, 400).
 *   4. key = cacheKey('/api/ai/query', body); a cached value → header x-cache: hit, return it.
 *   5. No deps.generate → AiError('no_api_key').
 *   5b. today = the browser's local date from the x-client-date header (M5 review: the server's
 *       UTC date is a day ahead every evening in Seattle). A header, not the body, so the demo
 *       cache key doesn't change from day to day. Accepted only within ±1 day of the server.
 *   6. result = await callStructured(deps.generate, { system: QUERY_SYSTEM, thinking: 'low',
 *        schema: QueryResponse, parts: [{ text: `Today is ${today}.\n\nNetwork:\n${summary}\n\nQuestion: ${question}` }] })
 *   7. GUARDRAIL IN CODE: personIds = unique ids that appear in summaryIds(summary). The model
 *      can never highlight someone who doesn't exist.
 *   8. cache.set(key, response); header x-cache: miss; return.
 *   9. Catch AiError → console.warn(`AI ${code} on ${path}: ${message}`) — NEVER the body —
 *      and reply with a friendly message: no_api_key / rate_limited / ai_unavailable → 503,
 *      bad_ai_response → 502. Messages, e.g. "The agent is busy. Try again in a minute."
 *
 * DONE WHEN
 *   - routes/ai.test.ts passes (unskip it: mocked Gemini) and the live questions in §10 work.
 *
 * Guide: §9.5
 */
import { Hono } from 'hono';
import { cleanEdits, QueryRequest, QueryResponse } from '@connectwork/shared';
import type { AppDeps } from '../app';
import { QUERY_SYSTEM } from '../prompts';
import { registerClassify } from './classify';
import { registerDraft } from './draft';
import { registerExtract } from './extract';
import { registerLinks } from './links';
import { registerMeetingBrief } from './meetingBrief';
import { structured, summaryIds } from './structured';
import { registerWeeklyReview } from './weeklyReview';

// Re-exported so existing imports (tests, M16) keep working after step R.
export { requestToday, summaryIds } from './structured';

export function aiRoutes(deps: AppDeps) {
  const routes = new Hono();

  // Steps 2–9, now as configuration (step R): validation, cache, retry, logging and
  // friendly errors all live in structured().
  structured(routes, deps, {
    path: '/query',
    request: QueryRequest,
    response: QueryResponse,
    system: QUERY_SYSTEM,
    thinking: 'low',
    // M10: the user's drift limits (or the defaults) travel with the question, not in the system prompt.
    parts: (b, today) => [
      {
        text: `Today is ${today}.\nLost-touch limits: ring 1 = ${b.driftDays?.ring1 ?? 90} days, ring 2 = ${b.driftDays?.ring2 ?? 180} days.\n\nNetwork:\n${b.summary}\n\nQuestion: ${b.question}`,
      },
    ],
    // Step 7. Guardrail in code: the model can never point at someone who isn't in the data.
    post: (res, b) => {
      const known = summaryIds(b.summary);
      // Oct 18: proposed edits get the same rule (cleanEdits also drops malformed ones).
      return { ...res, personIds: [...new Set(res.personIds)].filter((id) => known.has(id)), edits: cleanEdits(res.edits, known) };
    },
  });

  registerClassify(routes, deps); // M6
  registerLinks(routes, deps); // M6
  registerWeeklyReview(routes, deps); // M8
  registerDraft(routes, deps); // M8
  registerExtract(routes, deps); // M9
  registerMeetingBrief(routes, deps); // M11

  return routes;
}
