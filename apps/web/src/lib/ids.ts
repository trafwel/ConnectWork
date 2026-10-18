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

/**
 * Polish (Oct 18): a REPEATABLE id from a stable key (FNV-1a, base 36). Imported people use it, so
 * importing the same LinkedIn file after "Reset demo data" gives the same ids, and so the same
 * AI requests. The recorded demo answers (M12) are found by a hash of the request, and with
 * random ids they could never match after an import.
 */
export function stableId(prefix: string, key: string): string {
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  for (let i = 0; i < key.length; i++) {
    const c = key.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 0x01000193) >>> 0;
    h2 = Math.imul(h2 ^ c, 0x5bd1e995) >>> 0;
  }
  return `${prefix}_${(h1.toString(36) + h2.toString(36)).slice(0, 10)}`;
}

