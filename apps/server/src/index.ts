import { serve } from '@hono/node-server';
import { createApp, defaultDeps } from './app';
import { env } from './env';

const deps = defaultDeps();
if (!deps.generate) console.warn('GEMINI_API_KEY is not set: AI routes will answer 503 until it is added to .env.');

serve({ fetch: createApp(deps).fetch, port: env.port }, (info) => {
  console.log(`Connectwork server on http://localhost:${info.port} (cache=${deps.cache.mode})`);
});
