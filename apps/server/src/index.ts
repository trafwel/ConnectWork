/**
 * Server entry point · M0 state
 *
 * WHAT THIS DOES
 *   Starts the API on PORT (8787). `pnpm dev` runs it with tsx watch (restarts on
 *   file changes); production runs `pnpm start` (deploy/connectwork.service).
 *
 * STEPS
 *   M5  1. After defaultDeps(), warn loudly when there's no key:
 *            if (!deps.generate) console.warn('GEMINI_API_KEY is not set: AI routes will answer 503 …');
 *       2. Log the cache mode on start: `(cache=${env.demoCache})`.
 *   M16 3. When env.photonProjectId and env.photonProjectSecret are set, create one
 *          RelayHub, mount its routes, and start the texting agent WITHOUT awaiting it:
 *            void startTextingAgent({ generate: deps.generate, hub, memory: backboardMemory() })
 *
 * Guide: §4.3
 */
import { serve } from '@hono/node-server';
import { createApp, defaultDeps } from './app';
import { env } from './env';

const deps = defaultDeps();

serve({ fetch: createApp(deps).fetch, port: env.port, hostname: env.host }, (info) => {
  console.log(`Connectwork server on http://${env.host ?? 'localhost'}:${info.port}`);
});
