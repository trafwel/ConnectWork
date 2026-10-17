/**
 * R — Structured AI route helper · Owner: Person B · ~20 min · do this BEFORE M6
 *
 * WHAT THIS ACHIEVES
 *   Every AI endpoint does the same eight things: validate the request, check
 *   the demo cache, call Gemini with a schema, retry once on a bad reply, apply
 *   guardrails, cache the result, log failures without bodies, and return a
 *   friendly error. Today /query does all of that inline in routes/ai.ts.
 *   This helper turns each new endpoint (classify, links, weekly review,
 *   extract, draft, meeting brief) into ~15 lines of configuration, so the
 *   behaviour — and the safety rules — are identical everywhere.
 *
 * HOW IT FITS
 *   routes/ai.ts creates the Hono sub-app and calls `structured(...)` once per
 *   endpoint (the register* functions in classify.ts, links.ts, … call it).
 *   Gemini calls go through gemini.ts (fallback model + one retry already
 *   built in). Prompts live in prompts.ts. Contracts live in
 *   packages/shared/src/schemas.ts.
 *
 * STEPS
 *   1. Move STATUS and MESSAGES from routes/ai.ts into this file and export
 *      them (ai.ts imports them back) so there is one copy of the error text.
 *   2. Implement `structured()` below, following the numbered TODOs inside.
 *      The full reference implementation is in the guide (§11).
 *   3. Rewrite the /query handler in routes/ai.ts as:
 *        structured(routes, deps, {
 *          path: '/query', request: QueryRequest, response: QueryResponse,
 *          system: QUERY_SYSTEM, thinking: 'low',
 *          parts: (b, today) => [{ text: `Today is ${today}.\n\nNetwork:\n${b.summary}\n\nQuestion: ${b.question}` }],
 *          post: (res, b) => { const known = summaryIds(b.summary);
 *            return { ...res, personIds: [...new Set(res.personIds)].filter((id) => known.has(id)) }; },
 *        });
 *      Then run `pnpm test`: the 9 existing route tests MUST pass unchanged.
 *      That is the proof the refactor didn't change behaviour.
 *   4. Move `canonicalJson` from apps/server/src/cache.ts to
 *      packages/shared/src/canonical.ts, export it from the shared index, and
 *      import it in cache.ts. (M12's offline fallback computes the same cache
 *      key in the browser, so both sides must share one implementation.)
 *   5. In apps/web/src/lib/api.ts, export a one-line helper for new endpoints:
 *        export const aiPost = <T>(path: string, body: unknown, schema: …) => post<T>(`/ai${path}`, body, schema);
 *   6. Commit: "Refactor: structured AI route helper".
 *
 * DONE WHEN
 *   - /query is ~10 lines using structured(), and all tests still pass.
 *   - canonicalJson is imported from @connectwork/shared.
 *   - pnpm typecheck && pnpm lint && pnpm test && pnpm build are green.
 *
 * Guide: docs/IMPLEMENTATION_GUIDE.md §11
 */
import type { Hono } from 'hono';
import type { z } from 'zod';
import type { AppDeps } from '../app';
import type { Part, Thinking } from '../gemini';

export interface StructuredRoute<Req, Res> {
  /** Path under /api/ai, e.g. '/classify'. */
  path: string;
  /** Zod schema for the request body (400 if it fails). */
  request: z.ZodType<Req>;
  /** Zod schema the model's JSON must match (sent to Gemini as responseJsonSchema). */
  response: z.ZodType<Res>;
  /** System prompt from prompts.ts. */
  system: string;
  /** 'low' for lookups/extraction, 'medium' for planning (links, weekly review). */
  thinking?: Thinking;
  /** Builds the user message parts from the validated body. `today` is YYYY-MM-DD. */
  parts: (body: Req, today: string) => Part[];
  /** Guardrails applied to the model's reply: drop unknown ids, clamp values. */
  post?: (result: Res, body: Req) => Res;
  /** Default true. Set false when the body may contain real personal photos (M9). */
  cacheable?: boolean;
}

export function structured<Req, Res>(_routes: Hono, _deps: AppDeps, _route: StructuredRoute<Req, Res>): void {
  // TODO(R) 1: _routes.post(_route.path, async (c) => { … })
  // TODO(R) 2: parse the body with _route.request.safeParse(await c.req.json().catch(() => null));
  //            on failure return c.json({ error: 'bad_request', message: 'Invalid request body' }, 400)
  // TODO(R) 3: key = cacheKey(`/api/ai${_route.path}`, body); if _deps.cache.get(key) → set header
  //            'x-cache: hit' and return it
  // TODO(R) 4: if !_deps.generate → throw new AiError('no_api_key', …)
  // TODO(R) 5: result = await callStructured(_deps.generate, { system, thinking, parts: _route.parts(body, today), schema: _route.response })
  // TODO(R) 6: response = _route.post ? _route.post(result, body) : result
  // TODO(R) 7: if (_route.cacheable !== false) _deps.cache.set(key, response); header 'x-cache: miss'; return c.json(response)
  // TODO(R) 8: catch AiError → console.warn(`AI ${code} on ${path}: ${message.slice(0, 300)}`) (never the body!)
  //            and return c.json({ error: code, message: MESSAGES[code] }, STATUS[code]); rethrow anything else
  throw new Error('TODO(R): structured() is not implemented yet — see the steps at the top of this file');
}
