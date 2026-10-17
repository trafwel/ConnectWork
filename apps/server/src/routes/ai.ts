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
 *   Step R moves this handler onto routes/structured.ts; later routes register here.
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
import { cacheKey, type DemoCache } from '../cache';
import { AiError, callStructured, type Generate } from '../gemini';
import { QUERY_SYSTEM } from '../prompts';

/** Person ids present in a graph summary ("P|id|..." lines). */
export function summaryIds(summary: string): Set<string> {
  const ids = new Set<string>();
  for (const line of summary.split('\n')) {
    if (line.startsWith('P|')) {
      const id = line.split('|')[1];
      if (id) ids.add(id);
    }
  }
  return ids;
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

export function aiRoutes(deps: { generate: Generate | null; cache: DemoCache }) {
  const routes = new Hono();

  routes.post('/query', async (c) => {
    const parsed = QueryRequest.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) return c.json({ error: 'bad_request', message: 'Expected { question, summary }' }, 400);
    const body = parsed.data;

    const key = cacheKey('/api/ai/query', body);
    const cached = deps.cache.get(key);
    if (cached) {
      c.header('x-cache', 'hit');
      return c.json(cached);
    }

    try {
      if (!deps.generate) throw new AiError('no_api_key', 'GEMINI_API_KEY is not set');
      const today = new Date().toISOString().slice(0, 10);
      const result = await callStructured(deps.generate, {
        system: QUERY_SYSTEM,
        thinking: 'low',
        parts: [{ text: `Today is ${today}.\n\nNetwork:\n${body.summary}\n\nQuestion: ${body.question}` }],
        schema: QueryResponse,
      });
      // Drop ids the model made up.
      const known = summaryIds(body.summary);
      const response: QueryResponse = { ...result, personIds: [...new Set(result.personIds)].filter((id) => known.has(id)) };
      deps.cache.set(key, response);
      c.header('x-cache', 'miss');
      return c.json(response);
    } catch (err) {
      if (err instanceof AiError) {
        // Code and SDK message only: never the request body (personal data).
        console.warn(`AI ${err.code} on ${c.req.path}: ${err.message.slice(0, 300)}`);
        return c.json({ error: err.code, message: MESSAGES[err.code] }, STATUS[err.code]);
      }
      throw err;
    }
  });

  return routes;
}
