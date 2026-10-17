/**
 * M0/M5 — Shared package entry · done
 *
 * WHAT THIS ACHIEVES
 *   One import path for both apps: `import { Person, QueryResponse } from '@connectwork/shared'`.
 *
 * HOW IT WAS BUILT
 *   1. Types are re-exported type-only; schemas (zod values) are re-exported as values.
 *   2. package.json points main/types/exports at this file — no compile step.
 *
 * Guide: §4.2, §9.1
 */
export type * from './types';
export * from './schemas';
export * from './storedRows';
