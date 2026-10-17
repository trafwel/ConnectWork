/**
 * M0 — Server entry point · done
 *
 * WHAT THIS ACHIEVES
 *   Starts the API on PORT (8787) with real dependencies and warns loudly if the
 *   Gemini key is missing, so a misconfigured server is obvious in the logs.
 *
 * HOW IT FITS
 *   `pnpm dev` runs it with tsx watch (restarts on file changes); production runs
 *   `pnpm start` (deploy/connectwork.service).
 *
 * Guide: §4.3
 */
import { serve } from '@hono/node-server';
import { createApp, defaultDeps } from './app';
import { env } from './env';

const deps = defaultDeps();
if (!deps.generate) console.warn('GEMINI_API_KEY is not set: AI routes will answer 503 until it is added to .env.');

serve({ fetch: createApp(deps).fetch, port: env.port }, (info) => {
  console.log(`Connectwork server on http://localhost:${info.port} (cache=${deps.cache.mode})`);
});
