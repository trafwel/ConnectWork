/**
 * M13 — `pnpm preview:prod`: the production site on your laptop, with Caddy's headers
 *
 * WHY: Caddy isn't installed locally, and a Content-Security-Policy mistake only shows up in a
 * real browser (a blocked script = a blank page on the domain). This serves the BUILT app
 * (apps/web/dist) the way deploy/Caddyfile does: the same security headers, read straight from
 * the Caddyfile so they can't drift, the same caching, the SPA fallback, and /api proxied to the
 * API server. Open it, use the app, and watch the console for CSP errors.
 *
 * Usage: pnpm build && pnpm preview:prod   (needs the API on :8787, e.g. `pnpm dev` running)
 *        PREVIEW_PORT=4173 API=http://127.0.0.1:8787 to change either.
 */
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const dist = join(root, 'apps/web/dist');
const port = Number(process.env.PREVIEW_PORT ?? 4173);
const api = process.env.API ?? 'http://127.0.0.1:8787';

// The `header { … }` block of the Caddyfile: lines like  Name "value"  (and -Name to remove).
const caddy = await readFile(join(root, 'deploy/Caddyfile'), 'utf8');
const block = /\n\theader \{\n([\s\S]*?)\n\t\}/.exec(caddy)?.[1] ?? '';
const headers = [...block.matchAll(/^\t\t([A-Za-z-]+) "([^"]*)"$/gm)].map((m) => [m[1]!, m[2]!] as const);
if (!headers.some(([k]) => k === 'Content-Security-Policy')) throw new Error('No CSP found in deploy/Caddyfile');

const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.woff2': 'font/woff2',
  '.ico': 'image/x-icon',
};

createServer(async (req, res) => {
  for (const [k, v] of headers) res.setHeader(k, v);
  const url = new URL(req.url ?? '/', 'http://x');

  if (url.pathname.startsWith('/api/')) {
    // Like Caddy's reverse_proxy: same method, headers and body; X-Forwarded-For added.
    const chunks: Buffer[] = [];
    for await (const c of req) chunks.push(c as Buffer);
    try {
      const upstream = await fetch(api + url.pathname + url.search, {
        method: req.method,
        headers: { 'content-type': req.headers['content-type'] ?? 'application/json', 'x-client-date': String(req.headers['x-client-date'] ?? ''), 'x-forwarded-for': req.socket.remoteAddress ?? '' },
        body: req.method === 'GET' || req.method === 'HEAD' ? undefined : Buffer.concat(chunks),
      });
      res.statusCode = upstream.status;
      res.setHeader('content-type', upstream.headers.get('content-type') ?? 'application/json');
      const cache = upstream.headers.get('x-cache');
      if (cache) res.setHeader('x-cache', cache);
      res.end(Buffer.from(await upstream.arrayBuffer()));
    } catch {
      res.statusCode = 502; // what Caddy answers when the API is down (M12's fallback handles it)
      res.end('Bad Gateway');
    }
    return;
  }

  // Static files, with the SPA fallback and Caddy's caching rules. normalize() + the prefix check
  // keep "../" requests inside dist.
  const asset = url.pathname.startsWith('/assets/');
  let file = normalize(join(dist, decodeURIComponent(url.pathname)));
  if (!file.startsWith(dist)) {
    res.statusCode = 403;
    return res.end();
  }
  // Like Caddy: /assets/* is file_server only (a missing file is a 404); anything else that isn't
  // a file gets index.html (try_files {path} /index.html).
  let body = url.pathname === '/' ? null : await readFile(file).catch(() => null);
  if (!body && !asset) {
    file = join(dist, 'index.html');
    body = await readFile(file).catch(() => null);
  }
  if (!body) {
    res.statusCode = 404;
    return res.end(asset ? 'Not found' : 'Run `pnpm build` first.');
  }
  res.setHeader('content-type', TYPES[extname(file)] ?? 'application/octet-stream');
  res.setHeader('cache-control', asset ? 'public, max-age=31536000, immutable' : 'no-cache');
  res.end(body);
}).listen(port, () => {
  console.log(`Production preview on http://localhost:${port} (headers from deploy/Caddyfile, /api → ${api})`);
});
