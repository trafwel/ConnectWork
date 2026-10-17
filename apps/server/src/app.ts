import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { bodyLimit } from 'hono/body-limit';
import { env } from './env';

export const app = new Hono();

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
  c.json({ ok: true, model: env.geminiModel, tier: env.geminiTier, cache: env.demoCache }),
);

app.onError((err, c) => {
  console.error(`${c.req.method} ${c.req.path} error: ${err.message}`);
  return c.json({ error: 'internal', message: 'Something went wrong' }, 500);
});
