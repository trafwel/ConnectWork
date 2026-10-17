/**
 * M5 — AI routes (POST /api/ai/query) · done
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
import { QueryRequest, QueryResponse } from '@connectwork/shared';
import type { AppDeps } from '../app';
import { cacheKey } from '../cache';
import { AiError, callStructured } from '../gemini';
import { QUERY_SYSTEM } from '../prompts';

// Step 1. Person ids present in a graph summary ("P|id|..." lines).
export function summaryIds(summary: string): Set<string> {
  const ids = new Set<string>();
  for (const line of summary.split('\n')) {
    if (!line.startsWith('P|')) continue;
    const id = line.split('|')[1];
    if (id) ids.add(id);
  }
  return ids;
}

const DAY_MS = 86_400_000;
const localIso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** The user's calendar date: the browser's x-client-date if plausible, else the server's local date. */
export function requestToday(header: string | undefined, now = new Date()): string {
  if (header && /^\d{4}-\d{2}-\d{2}$/.test(header)) {
    const [y, m, d] = header.split('-').map(Number);
    const claimed = new Date(y!, m! - 1, d!);
    if (localIso(claimed) === header && Math.abs(claimed.getTime() - now.getTime()) <= 2 * DAY_MS) return header;
  }
  return localIso(now);
}

const STATUS: Record<AiError['code'], 502 | 503> = {
  no_api_key: 503,
  rate_limited: 503,
  ai_unavailable: 503,
  bad_ai_response: 502,
};

const MESSAGES: Record<AiError['code'], string> = {
  no_api_key: 'The AI is not set up yet: add GEMINI_API_KEY to .env and restart the server.',
  rate_limited: 'The agent is busy. Try again in a minute.',
  ai_unavailable: 'The AI service did not respond. Try again shortly.',
  bad_ai_response: 'The AI gave an unusable answer. Try rephrasing.',
};

export function aiRoutes(deps: AppDeps) {
  const routes = new Hono();

  routes.post('/query', async (c) => {
    // Step 3
    const parsed = QueryRequest.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) return c.json({ error: 'bad_request', message: 'Expected { question, summary }' }, 400);
    const body = parsed.data;

    // Step 4
    const key = cacheKey('/api/ai/query', body);
    const cached = deps.cache?.get(key);
    if (cached) {
      c.header('x-cache', 'hit');
      return c.json(cached);
    }

    try {
      // Step 5
      if (!deps.generate) throw new AiError('no_api_key', 'GEMINI_API_KEY is not set');
      const today = requestToday(c.req.header('x-client-date'));
      // Step 6
      const result = await callStructured(deps.generate, {
        system: QUERY_SYSTEM,
        thinking: 'low',
        schema: QueryResponse,
        parts: [{ text: `Today is ${today}.\n\nNetwork:\n${body.summary}\n\nQuestion: ${body.question}` }],
      });
      // Step 7. Guardrail in code: the model can never point at someone who isn't in the data.
      const known = summaryIds(body.summary);
      const response: QueryResponse = { ...result, personIds: [...new Set(result.personIds)].filter((id) => known.has(id)) };
      // Step 8
      deps.cache?.set(key, response);
      c.header('x-cache', 'miss');
      return c.json(response);
    } catch (err) {
      // Step 9. Code and SDK message only: NEVER the request body (names, companies).
      if (err instanceof AiError) {
        console.warn(`AI ${err.code} on ${c.req.path}: ${err.message.slice(0, 300)}`);
        return c.json({ error: err.code, message: MESSAGES[err.code] }, STATUS[err.code]);
      }
      throw err;
    }
  });

  return routes;
}
