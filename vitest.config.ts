/**
 * M0 — Test runner config · done
 *
 * WHAT THIS ACHIEVES
 *   One `pnpm test` runs every unit test in the repo (shared, server, web,
 *   scripts) in Node, fast, with no browser.
 *
 * HOW IT FITS
 *   Test files sit next to the code they test (name.test.ts). The `@` alias
 *   mirrors apps/web/vite.config.ts so web tests import modules the same way the
 *   app does.
 *
 * HOW IT WAS BUILT
 *   1. include: test files under packages, apps and scripts.
 *   2. environment 'node' — logic under test is pure (no DOM, no IndexedDB).
 *   3. alias '@' → apps/web/src.
 *
 * DONE WHEN
 *   - `pnpm test` finds and runs every *.test.ts (40 tests after M5).
 *
 * Guide: docs/IMPLEMENTATION_GUIDE.md §4.1
 */
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: { '@': fileURLToPath(new URL('./apps/web/src', import.meta.url)) },
  },
  test: {
    include: ['packages/*/src/**/*.test.ts', 'apps/*/src/**/*.test.ts', 'scripts/**/*.test.ts'],
    environment: 'node',
  },
});
