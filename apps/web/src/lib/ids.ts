/**
 * M1 — Id helper · done
 *
 * WHAT THIS ACHIEVES
 *   Short, unique, readable ids like p_V1StGXR8_Z ("p" person, "l" link, "r" reminder,
 *   "c" contact log). They're sent to the AI in M5, so short ids also save tokens, and
 *   the prefix makes logs and the database easy to read.
 *
 * Guide: §5.4
 */
import { nanoid } from 'nanoid';

export const newId = (prefix: string): string => `${prefix}_${nanoid(10)}`;
