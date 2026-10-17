/**
 * M1 — Id helper · done
 *
 * WHAT THIS ACHIEVES
 *   Short, unique, readable ids like p_V1StGXR8_Z ("p" person, "l" link, "r" reminder,
 *   "c" contact log). They appear in the AI summary, so short ids also save tokens.
 *
 * Guide: §5.4
 */
import { nanoid } from 'nanoid';

export const newId = (prefix: string) => `${prefix}_${nanoid(10)}`;
