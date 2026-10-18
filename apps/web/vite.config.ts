/**
 * M0 — Vite config for the web app · done
 *
 * WHAT THIS ACHIEVES
 *   Instant dev server with hot reload, React + Tailwind built in, and an /api
 *   proxy so the browser talks to one origin in development (no CORS setup).
 *
 * HOW IT FITS
 *   `pnpm dev` runs this on :5173 next to the API server on :8787. Requests to
 *   /api/* are forwarded to the server.
 *
 * HOW IT WAS BUILT
 *   1. Plugins: @vitejs/plugin-react and @tailwindcss/vite (Tailwind v4, no tailwind.config needed).
 *   2. Alias '@' → src (also declared in tsconfig paths and vitest.config.ts).
 *   3. server.proxy: '/api' → http://localhost:8787.
 *
 * DONE WHEN
 *   - http://localhost:5173/api/health returns the server's health JSON.
 *
 * Gotcha: after installing a package, a stale dependency cache can serve two copies of
 * React ("Invalid hook call", 504 Outdated Optimize Dep). Fix: stop dev, delete
 * apps/web/node_modules/.vite, start again.
 * Guide: §4.4
 */
import path from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // M11: read the ONE .env at the repo root (VITE_GOOGLE_CLIENT_ID lives there). Only VITE_*
  // variables reach the browser bundle, so GEMINI_API_KEY in the same file stays server-only.
  envDir: path.resolve(import.meta.dirname, '../..'),
  envPrefix: 'VITE_',
  resolve: { alias: { '@': path.resolve(import.meta.dirname, 'src') } },
  server: {
    port: 5173,
    proxy: { '/api': 'http://localhost:8787' },
  },
});
