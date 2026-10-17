/**
 * M0/M5 — API app: middleware, health, AI routes · done
 *
 * WHAT THIS ACHIEVES
 *   The whole HTTP surface of the server: CORS locked to our web origin, a 10 MB
 *   body limit, privacy-safe request logging, a health check, rate-limited AI routes,
 *   and a catch-all error handler that never leaks internals.
 *
 * HOW IT FITS
 *   createApp(deps) is a factory so tests can pass a fake Gemini and a temp cache
 *   (routes/ai.test.ts); index.ts passes defaultDeps() with the real ones.
 *
 * HOW IT WAS BUILT
 *   1. cors({ origin: ALLOWED_ORIGIN }) and bodyLimit(10 MB) on /api/*.
 *   2. Logging middleware: method, path, status, latency, cache hit/miss — NEVER bodies
 *      (they contain people's names and notes).
 *   3. GET /api/health → { ok, model, fallbackModel, tier, cache, aiConfigured }.
 *   4. 30 requests/minute per IP on /api/ai/* (rateLimit.ts), then the AI routes (routes/ai.ts).
 *   5. onError → { error: 'internal', message } with 500.
 *
 * Guide: §4.3, §9.5
 */
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { bodyLimit } from 'hono/body-limit';
import { DemoCache } from './cache';
import { env } from './env';
import { geminiGenerate, type Generate } from './gemini';
import { rateLimit } from './rateLimit';
import { aiRoutes } from './routes/ai';

export interface AppDeps {
  generate: Generate | null;
  cache: DemoCache;
}

export function defaultDeps(): AppDeps {
  return {
    generate: env.geminiApiKey ? geminiGenerate(env.geminiApiKey, env.geminiModel, env.geminiFallbackModel || undefined) : null,
    cache: new DemoCache(env.demoCache),
  };
}

export function createApp(deps: AppDeps) {
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

  app.get('/api/health', (c) =>
    c.json({ ok: true, model: env.geminiModel, fallbackModel: env.geminiFallbackModel || null, tier: env.geminiTier, cache: deps.cache.mode, aiConfigured: Boolean(deps.generate) }),
  );

  app.use('/api/ai/*', rateLimit(30, 60_000));
  app.route('/api/ai', aiRoutes(deps));

  app.onError((err, c) => {
    console.error(`${c.req.method} ${c.req.path} error: ${err.message}`);
    return c.json({ error: 'internal', message: 'Something went wrong' }, 500);
  });

  return app;
}
