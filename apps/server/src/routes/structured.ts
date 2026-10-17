/**
 * R — Structured AI route helper · done
 *
 * WHAT THIS ACHIEVES
 *   Every AI endpoint does the same eight things: validate the request, check
 *   the demo cache, call Gemini with a schema, retry once on a bad reply, apply
 *   guardrails, cache the result, log failures without bodies, and return a
 *   friendly error. This helper does them once, so each endpoint (query,
 *   classify, links, weekly review, extract, draft, meeting brief) is a short
 *   configuration — and the safety rules are identical everywhere.
 *
 * HOW IT FITS
 *   routes/ai.ts creates the Hono sub-app and calls `structured(...)` per
 *   endpoint (directly for /query; via registerClassify, registerLinks, … for the
 *   rest). Gemini calls go through gemini.ts (fallback model + one retry).
 *   Prompts live in prompts.ts; contracts in packages/shared/src/schemas.ts.
 *
 * HOW IT WAS BUILT
 *   1. STATUS and MESSAGES moved here so there is one copy of the error text.
 *   2. structured(): validate (400) → cache hit → no key (503) → callStructured →
 *      post() guardrails → cache (unless cacheable says no) → reply; AiError →
 *      log "AI <code> on <path>" (never the body) + friendly message.
 *   3. /query was rewritten on top of it; its tests passed unchanged.
 *   4. canonicalJson moved to @connectwork/shared (the browser needs it in M12).
 *
 * Guide: docs/IMPLEMENTATION_GUIDE.md §11
 */
import type { Hono } from 'hono';
import type { z } from 'zod';
import type { AppDeps } from '../app';
import { cacheKey } from '../cache';
import { AiError, callStructured, type Part, type Thinking } from '../gemini';

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
  /** Default true. false (or a function returning false) for bodies that may hold real photos (M9). */
  cacheable?: boolean | ((body: Req) => boolean);
  /** Message for a 400; defaults to a generic one. */
  badRequest?: string;
}

export function structured<Req, Res>(routes: Hono, deps: AppDeps, route: StructuredRoute<Req, Res>): void {
  routes.post(route.path, async (c) => {
    const parsed = route.request.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) return c.json({ error: 'bad_request', message: route.badRequest ?? 'Invalid request body' }, 400);
    const body = parsed.data;

    const cacheable = typeof route.cacheable === 'function' ? route.cacheable(body) : route.cacheable !== false;
    const key = cacheKey(`/api/ai${route.path}`, body);
    const cached = cacheable ? deps.cache.get(key) : undefined;
    if (cached) {
      c.header('x-cache', 'hit');
      return c.json(cached);
    }

    try {
      if (!deps.generate) throw new AiError('no_api_key', 'GEMINI_API_KEY is not set');
      const today = new Date().toISOString().slice(0, 10);
      const result = await callStructured(deps.generate, {
        system: route.system,
        thinking: route.thinking,
        parts: route.parts(body, today),
        schema: route.response,
      });
      const response = route.post ? route.post(result, body) : result;
      if (cacheable) deps.cache.set(key, response);
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
}
