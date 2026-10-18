/**
 * M0 — Lint config · done
 *
 * WHAT THIS ACHIEVES
 *   Catches real bugs before they reach the demo: unused code, unsafe types,
 *   and React hook mistakes (hooks in the wrong order, missing dependencies,
 *   refs read during render).
 *
 * HOW IT FITS
 *   `pnpm lint` checks the whole repo; it is one of the four checks before every commit.
 *
 * HOW IT WAS BUILT
 *   1. ESLint flat config: @eslint/js recommended + typescript-eslint recommended.
 *   2. react-hooks rules for the web app only.
 *   3. Ignore build output and shadcn's generated components (components/ui).
 *   4. Unused parameters prefixed with _ are allowed, so scaffolds can keep their final signatures.
 *
 * DONE WHEN
 *   - `pnpm lint` prints nothing.
 *
 * Note: typescript-eslint supports TypeScript < 6.1, which is why TypeScript is pinned to ~6.0.3.
 * Guide: §4.1
 */
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';

export default tseslint.config(
  { ignores: ['**/dist/**', '**/node_modules/**', 'apps/web/src/components/ui/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    // Stubs keep their final signatures; prefix a not-yet-used parameter with _ .
    rules: { '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }] },
  },
  {
    // Plain Node scripts (e.g. scripts/check-dev.mjs runs before pnpm dev, without TypeScript).
    files: ['scripts/**/*.mjs'],
    languageOptions: { globals: { process: 'readonly', console: 'readonly', URL: 'readonly' } },
  },
  {
    files: ['apps/web/src/**/*.{ts,tsx}'],
    plugins: { 'react-hooks': reactHooks },
    rules: reactHooks.configs.recommended.rules,
  },
);
