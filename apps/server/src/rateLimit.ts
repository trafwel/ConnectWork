/**
 * M5 — Rate limit for AI routes · Owner: Person B · ~15 min
 *
 * WHAT THIS ACHIEVES
 *   Protects our Gemini quota and costs: at most 30 AI requests per minute per IP.
 *   In memory, which is enough for one small server.
 *
 * STEPS
 *   1. A Map<ip, { count, resetAt }>. IP = first value of x-forwarded-for, else x-real-ip,
 *      else 'local' (behind Caddy in M13 the forwarded header is set).
 *   2. Fixed window: no entry or resetAt passed → { count: 1, resetAt: now + windowMs };
 *      otherwise count++.
 *   3. Over the limit → set header retry-after (seconds until reset) and return
 *      c.json({ error: 'rate_limited', message: 'Too many requests. Try again in a minute.' }, 429).
 *   4. Otherwise await next().
 *   5. Mounted in app.ts on '/api/ai/*' only (health stays unlimited).
 *
 * Guide: §9.5
 */
import type { MiddlewareHandler } from 'hono';

export function rateLimit(_limit: number, _windowMs: number): MiddlewareHandler {
  // TODO(M5) steps 1–4
  return async (_c, next) => {
    await next();
  };
}
