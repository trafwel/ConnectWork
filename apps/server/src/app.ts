/**
 * API app · M0 state (AI routes are added in M5)
 *
 * WHAT THIS DOES NOW (M0)
 *   The HTTP surface of the server: CORS locked to our web origin, a 10 MB body
 *   limit, privacy-safe request logging, GET /api/health, and an error handler
 *   that never leaks internals.
 *
 * WHY createApp(deps) INSTEAD OF A PLAIN `app`
 *   A factory lets tests pass a fake Gemini and a temporary cache
 *   (routes/ai.test.ts) while index.ts passes the real ones (defaultDeps()).
 *   At M0 the deps are unused; they matter from M5.
 *
 * STEPS — M5 (AI query). Follow apps/server/src/gemini.ts, cache.ts, rateLimit.ts
 * and routes/ai.ts first, then come back here:
 *   1. defaultDeps(): generate = env.geminiApiKey ? geminiGenerate(env.geminiApiKey,
 *      env.geminiModel, env.geminiFallbackModels) : null; cache = new DemoCache(env.demoCache).
 *   2. Health: add `fallbackModels: env.geminiFallbackModels` and `aiConfigured: Boolean(deps.generate)`.
 *   3. After the health route:
 *        app.use('/api/ai/*', rateLimit(30, 60_000));
 *        app.route('/api/ai', aiRoutes(deps));
 *   4. Keep the logging middleware exactly as is: route, status, latency, cache
 *      hit/miss — NEVER request bodies (they contain people's names and notes).
 *
 * DONE WHEN (M0)
 *   - curl localhost:5173/api/health → {"ok":true,...}
 *
 * Guide: docs/IMPLEMENTATION_GUIDE.md §4.3, §9.5
 */
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { bodyLimit } from 'hono/body-limit';
import type { DemoCache } from './cache';
import { env } from './env';
import type { Generate } from './gemini';

export interface AppDeps {
  /** Gemini caller (M5); null when no GEMINI_API_KEY is set. */
  generate: Generate | null;
  /** Demo reply cache (M5/M12). */
  cache: DemoCache | null;
}

export function defaultDeps(): AppDeps {
  // TODO(M5) step 1: real Gemini + DemoCache
  return { generate: null, cache: null };
}

export function createApp(_deps: AppDeps) {
  const app = new Hono();

  app.use('/api/*', cors({ origin: env.allowedOrigin }));
  app.use('/api/*', bodyLimit({ maxSize: 10 * 1024 * 1024 }));

  // Log route, status and latency only; request bodies may hold personal data.
  app.use('/api/*', async (c, next) => {
    const started = Date.now();
    await next();
    const cache = c.res.headers.get('x-cache') ?? '-';
    console.log(`${c.req.method} ${c.req.path} ${c.res.status} ${Date.now() - started}ms cache=${cache}`);
  });

  app.get('/api/health', (c) => c.json({ ok: true, model: env.geminiModel, tier: env.geminiTier, cache: env.demoCache }));
  // TODO(M5) steps 2–3: extend health; rate-limit and mount the AI routes here.

  app.onError((err, c) => {
    console.error(`${c.req.method} ${c.req.path} error: ${err.message}`);
    return c.json({ error: 'internal', message: 'Something went wrong' }, 500);
  });

  return app;
}
