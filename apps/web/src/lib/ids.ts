/**
 * M1 — Id helper · ~2 min
 *
 * WHAT THIS ACHIEVES
 *   Short, unique, readable ids like p_V1StGXR8_Z ("p" person, "l" link, "r" reminder,
 *   "c" contact log). They appear in the AI summary (M5), so short ids also save tokens.
 *
 * STEPS
 *   1. import { nanoid } from 'nanoid';
 *   2. return `${prefix}_${nanoid(10)}`;
 *
 * Guide: §5.4
 */

export function newId(_prefix: string): string {
  // TODO(M1) steps 1–2
  throw new Error('TODO(M1): newId is not implemented yet');
}
