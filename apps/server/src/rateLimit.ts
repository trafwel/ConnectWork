/**
 * M5 — Rate limit for AI routes · done
 *
 * WHAT THIS ACHIEVES
 *   Protects our Gemini quota and costs: at most 30 AI requests per minute per IP.
 *   In memory, which is enough for one small server.
 *
 * STEPS
 *   1. A Map<ip, { count, resetAt }>. IP: with trustProxy (TRUST_PROXY=1, behind Caddy in M13)
 *      the first value of x-forwarded-for / x-real-ip; otherwise the real socket address
 *      (M5 review: a client can send any X-Forwarded-For and dodge the limit).
 *   2. Fixed window: no entry or resetAt passed → { count: 1, resetAt: now + windowMs };
 *      otherwise count++.
 *   3. Over the limit → set header retry-after (seconds until reset) and return
 *      c.json({ error: 'rate_limited', message: 'Too many requests. Try again in a minute.' }, 429).
 *   4. Otherwise await next().
 *   5. Mounted in app.ts on '/api/ai/*' only (health stays unlimited).
 *
 * Guide: §9.5
 */
import { getConnInfo } from '@hono/node-server/conninfo';
import type { Context, MiddlewareHandler } from 'hono';

/** Above this many tracked clients, expired entries are swept so memory can't grow forever. */
const SWEEP_AT = 10_000;

function clientIp(c: Context, trustProxy: boolean): string {
  if (trustProxy) {
    const forwarded = c.req.header('x-forwarded-for')?.split(',')[0]?.trim() || c.req.header('x-real-ip');
    if (forwarded) return forwarded;
  }
  try {
    return getConnInfo(c).remote.address ?? 'local';
  } catch {
    return 'local'; // tests (app.request) have no socket
  }
}

export function rateLimit(limit: number, windowMs: number, opts: { trustProxy?: boolean } = {}): MiddlewareHandler {
  const hits = new Map<string, { count: number; resetAt: number }>();
  return async (c, next) => {
    const now = Date.now();
    if (hits.size > SWEEP_AT) for (const [ip, e] of hits) if (e.resetAt <= now) hits.delete(ip);

    // Step 2. Fixed window per client.
    const ip = clientIp(c, opts.trustProxy ?? false);
    const entry = hits.get(ip);
    if (!entry || entry.resetAt <= now) {
      hits.set(ip, { count: 1, resetAt: now + windowMs });
    } else if (++entry.count > limit) {
      // Step 3
      c.header('retry-after', String(Math.ceil((entry.resetAt - now) / 1000)));
      return c.json({ error: 'rate_limited', message: 'Too many requests. Try again in a minute.' }, 429);
    }
    await next();
  };
}
