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

const server = serve({ fetch: createApp(deps).fetch, port: env.port }, (info) => {
  console.log(`Connectwork server on http://localhost:${info.port}`);
});

// A taken port used to end in a stack trace and pnpm's one-line "recursive run failed".
// Say what happened and how to fix it instead (scripts/check-dev.mjs checks this up front too).
server.on('error', (err: NodeJS.ErrnoException) => {
  if (err.code === 'EADDRINUSE') {
    console.error(
      [
        `\n✖ Port ${env.port} is already in use.`,
        '  That is usually an earlier `pnpm dev` that is still running (another terminal or tab).',
        `  Stop it with Ctrl+C there, or find it with: lsof -nP -iTCP:${env.port} -sTCP:LISTEN   and stop it with: kill <pid>`,
        '  Then run `pnpm dev` again.\n',
      ].join('\n'),
    );
    process.exit(1);
  }
  throw err;
});
