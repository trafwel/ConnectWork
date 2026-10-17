/**
 * R — Structured AI route helper · done (M6)
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
 *      (Also moved here: summaryIds and requestToday. links.ts needs summaryIds, and
 *      importing it from ai.ts — which registers links.ts — would be a circular import.)
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
import { cacheKey } from '../cache';
import { AiError, callStructured, type Part, type Thinking } from '../gemini';

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

// Step 1. One copy of the error codes and texts for every AI route.
export const STATUS: Record<AiError['code'], 502 | 503> = {
  no_api_key: 503,
  rate_limited: 503,
  ai_unavailable: 503,
  bad_ai_response: 502,
};

export const MESSAGES: Record<AiError['code'], string> = {
  no_api_key: 'The AI is not set up yet: add GEMINI_API_KEY to .env and restart the server.',
  rate_limited: 'The agent is busy. Try again in a minute.',
  ai_unavailable: 'The AI service did not respond. Try again shortly.',
  bad_ai_response: 'The AI gave an unusable answer. Try rephrasing.',
};

/** Person ids present in a graph summary ("P|id|..." lines). */
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

/** The user's calendar date: the browser's x-client-date if plausible (±1 day), else the server's local date. */
export function requestToday(header: string | undefined, now = new Date()): string {
  if (header && /^\d{4}-\d{2}-\d{2}$/.test(header)) {
    const [y, m, d] = header.split('-').map(Number);
    const claimed = new Date(y!, m! - 1, d!);
    if (localIso(claimed) === header && Math.abs(claimed.getTime() - now.getTime()) <= 2 * DAY_MS) return header;
  }
  return localIso(now);
}

// Step 2. Validate → cache → Gemini (schema, retry) → guardrails → cache → reply; friendly errors.
export function structured<Req, Res>(routes: Hono, deps: AppDeps, route: StructuredRoute<Req, Res>): void {
  routes.post(route.path, async (c) => {
    const parsed = route.request.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) return c.json({ error: 'bad_request', message: 'Invalid request body' }, 400);
    const body = parsed.data;

    const cacheable = route.cacheable !== false;
    const key = cacheKey(`/api/ai${route.path}`, body);
    const cached = cacheable ? deps.cache?.get(key) : undefined;
    if (cached) {
      c.header('x-cache', 'hit');
      return c.json(cached);
    }

    try {
      if (!deps.generate) throw new AiError('no_api_key', 'GEMINI_API_KEY is not set');
      const today = requestToday(c.req.header('x-client-date'));
      const result = await callStructured(deps.generate, {
        system: route.system,
        thinking: route.thinking,
        parts: route.parts(body, today),
        schema: route.response,
      });
      const response = route.post ? route.post(result, body) : result;
      if (cacheable) deps.cache?.set(key, response);
      c.header('x-cache', 'miss');
      return c.json(response as object);
    } catch (err) {
      // Code and SDK message only: NEVER the request body (names, companies, photos).
      if (err instanceof AiError) {
        console.warn(`AI ${err.code} on ${c.req.path}: ${err.message.slice(0, 300)}`);
        return c.json({ error: err.code, message: MESSAGES[err.code] }, STATUS[err.code]);
      }
      throw err;
    }
  });
}
