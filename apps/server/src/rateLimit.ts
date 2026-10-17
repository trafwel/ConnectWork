/**
 * M5 — Rate limit for AI routes · done
 *
 * WHAT THIS ACHIEVES
 *   Protects our Gemini quota and costs: at most 30 AI requests per minute per IP.
 *   In memory, which is enough for one small server.
 *
 * Guide: §9.5
 */
import type { MiddlewareHandler } from 'hono';

/** Fixed-window limit per client IP. In memory: fine for one small server. */
export function rateLimit(limit: number, windowMs: number): MiddlewareHandler {
  const hits = new Map<string, { count: number; resetAt: number }>();
  return async (c, next) => {
    const ip = c.req.header('x-forwarded-for')?.split(',')[0]?.trim() || c.req.header('x-real-ip') || 'local';
    const now = Date.now();
    const entry = hits.get(ip);
    if (!entry || entry.resetAt <= now) {
      hits.set(ip, { count: 1, resetAt: now + windowMs });
    } else if (++entry.count > limit) {
      c.header('retry-after', String(Math.ceil((entry.resetAt - now) / 1000)));
      return c.json({ error: 'rate_limited', message: 'Too many requests. Try again in a minute.' }, 429);
    }
    await next();
  };
}
