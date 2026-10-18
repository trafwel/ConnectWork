/**
 * API app · M5 state (more AI routes from M6)
 *
 * WHAT THIS DOES NOW (M5)
 *   The HTTP surface of the server: CORS locked to our web origin, a 10 MB body
 *   limit, privacy-safe request logging, GET /api/health, rate-limited
 *   POST /api/ai/query, and an error handler that never leaks internals.
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
import { DemoCache } from './cache';
import { env } from './env';
import { geminiGenerate, type Generate } from './gemini';
import { rateLimit } from './rateLimit';
import { aiRoutes } from './routes/ai';
import { relayRoutes, type RelayHub } from './photon/relay';

export interface AppDeps {
  /** Gemini caller (M5); null when no GEMINI_API_KEY is set. */
  generate: Generate | null;
  /** Demo reply cache (M5/M12). */
  cache: DemoCache | null;
  /** M16: relay to the open browser tab; set only when the texting agent runs. */
  hub?: RelayHub;
}

// Step 1
export function defaultDeps(): AppDeps {
  return {
    generate: env.geminiApiKey ? geminiGenerate(env.geminiApiKey, env.geminiModel, env.geminiFallbackModels) : null,
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

  // Step 2. Says whether AI is configured, never the key itself.
  app.get('/api/health', (c) =>
    c.json({
      ok: true,
      model: env.geminiModel,
      fallbackModels: env.geminiFallbackModels,
      tier: env.geminiTier,
      cache: env.demoCache,
      aiConfigured: Boolean(deps.generate),
      // M16: whether texts can be answered right now (the agent runs and a tab is listening).
      texting: deps.hub ? (deps.hub.connected ? 'tab connected' : 'waiting for a tab') : 'off',
    }),
  );

  // M16 step 6. The relay only exists when the texting agent runs AND a relay token is set.
  if (deps.hub && env.relayToken) {
    const relay = new Hono();
    relayRoutes(deps.hub, relay, env.relayToken);
    app.route('/api/relay', relay);
  }

  // Step 3. Only the AI routes are limited; health stays free.
  app.use('/api/ai/*', rateLimit(30, 60_000, { trustProxy: env.trustProxy }));
  app.route('/api/ai', aiRoutes(deps));

  app.onError((err, c) => {
    console.error(`${c.req.method} ${c.req.path} error: ${err.message}`);
    return c.json({ error: 'internal', message: 'Something went wrong' }, 500);
  });

  return app;
}
