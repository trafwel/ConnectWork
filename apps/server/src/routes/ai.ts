/**
 * M5 — AI routes (POST /api/ai/query) · Owner: Person B · ~45 min
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
import type { AppDeps } from '../app';

export function summaryIds(_summary: string): Set<string> {
  // TODO(M5) step 1
  return new Set();
}

export function aiRoutes(_deps: AppDeps) {
  const routes = new Hono();
  // TODO(M5) steps 2–9
  return routes;
}
