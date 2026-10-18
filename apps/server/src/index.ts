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
import { createApp, defaultDeps, type AppDeps } from './app';
import { backboardMemory } from './backboard';
import { startTextingAgent } from './photon/agent';
import { RelayHub } from './photon/relay';
import { env } from './env';

const deps: AppDeps = defaultDeps();

// M16 step 3. The texting agent runs only with Photon credentials AND a relay token (no token =
// no way for the browser to answer), and not where TEXTING_AGENT=0.
const agentConfigured = Boolean(env.photonProjectId && env.photonProjectSecret && env.relayToken);
if (agentConfigured && env.textingAgent) deps.hub = new RelayHub();

serve({ fetch: createApp(deps).fetch, port: env.port, hostname: env.host }, (info) => {
  console.log(`Connectwork server on http://${env.host ?? 'localhost'}:${info.port}`);
});

if (deps.hub) {
  // Not awaited: the loop runs for the life of the server while HTTP keeps serving.
  startTextingAgent({ generate: deps.generate, hub: deps.hub, memory: backboardMemory() }).catch((e: unknown) =>
    console.error(`Texting agent stopped: ${e instanceof Error ? e.message : 'unknown error'}`),
  );
} else if (agentConfigured) console.log('Texting agent: off here (TEXTING_AGENT=0)');
