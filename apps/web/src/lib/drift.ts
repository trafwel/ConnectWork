/**
 * M10 — Drift: relationships fading over time · done (step 1 landed early, in M5)
 *
 * WHAT THIS ACHIEVES
 *   Close people you haven't talked to in a while visibly drift outward and
 *   fade on the map, and they feed the weekly review's "reconnect" actions.
 *   It turns "I should keep in touch" into something you can see.
 *
 * HOW IT FITS
 *   driftLevel() is used by: App.tsx (driftingIds for the Drifting filter),
 *   RingMap (offsetFor → pushes nodes outward), PersonNode (opacity, dotted outline),
 *   PersonCard ("· drifting"), weeklyCandidates (reconnect).
 *   IMPORTANT: the thresholds must match the "lost touch" rule in
 *   apps/server/src/prompts.ts (QUERY_SYSTEM). If you make them editable in
 *   Settings, send the current values with each query.
 *
 * STEPS
 *   1. driftLevel(p, now, thresholds):
 *        limit = thresholds[p.ring]; if no lastContact or limit is Infinity → 0
 *        return clamp((daysSince(p.lastContact, now) - limit) / limit, 0, 1)
 *      (0 = fine, 1 = twice the threshold or worse).
 *   2. Tests lib/drift.test.ts: no lastContact → 0; exactly at threshold → 0;
 *      2× threshold → 1; ring 3 → always 0; 1.5× → 0.5.
 *   3. App.tsx: driftingIds = people with driftLevel > 0 → filterContext.
 *   4. RingMap: offsetFor={(p) => driftLevel(p)}, multiplied by 0.06 × base inside RingMap.
 *   5. PersonNode: opacity 1 − 0.5 × drift (unless dimmed) and strokeDasharray "2 3" when drift > 0.
 *   6. PersonCard: "Last contact 7 months ago · drifting" in orange-red.
 *   7. Settings: two number inputs (ring 1, ring 2) saved to db.meta 'driftThresholds'.
 *
 * DONE WHEN
 *   - On the seed, the 5 drifting people sit further out and fade; the Drifting
 *     tab shows exactly those 5.
 *
 * Guide: §17.1–17.2
 */
import type { Person, Ring } from '@connectwork/shared';
import { daysSince } from './dates';

export const DEFAULT_THRESHOLDS: Record<Ring, number> = { 1: 90, 2: 180, 3: Infinity };
export type Thresholds = Record<Ring, number>;

/** Step 7. Settings accepts 7 days to 10 years; ring 2 is never stricter than ring 1. */
export const THRESHOLD_MIN = 7;
export const THRESHOLD_MAX = 3650;

/**
 * Step 7. Reads the stored `driftThresholds` (db.meta) defensively: it may be missing, from an
 * old backup or hand-edited, so anything odd falls back to the default for that ring.
 */
export function parseThresholds(value: unknown): Thresholds {
  const v = (value && typeof value === 'object' ? value : {}) as Record<string, unknown>;
  const pick = (ring: 1 | 2) => {
    const n = v[ring];
    return typeof n === 'number' && Number.isInteger(n) && n >= THRESHOLD_MIN && n <= THRESHOLD_MAX ? n : DEFAULT_THRESHOLDS[ring];
  };
  return { 1: pick(1), 2: pick(2), 3: Infinity };
}

export const isDefaultThresholds = (t: Thresholds) => t[1] === DEFAULT_THRESHOLDS[1] && t[2] === DEFAULT_THRESHOLDS[2];

/**
 * M4-O4. A LinkedIn import copies "Connected on" into lastContact, because it's the only date
 * we have. But clicking "Connect" is not keeping in touch: after an AI sort moves 100 imported
 * people into ring 2, all of them would "drift" at once. Until the user logs a real contact
 * (which changes lastContact), that date doesn't count.
 */
export const isConnectDateOnly = (p: Person) => p.source === 'linkedin' && Boolean(p.metAt) && p.lastContact === p.metAt;

// Step 1 (done in M5: AgentBar uses it so "who have I lost touch with?" is computed, not guessed).
export function driftLevel(person: Person, now: Date = new Date(), thresholds: Thresholds = DEFAULT_THRESHOLDS): number {
  const limit = thresholds[person.ring];
  if (!person.lastContact || !Number.isFinite(limit) || isConnectDateOnly(person)) return 0;
  return Math.min(1, Math.max(0, (daysSince(person.lastContact, now) - limit) / limit));
}

/**
 * Step 4. How far outward a drifting person sits, as a share of the map's size (SPEC §12:
 * 0.06 × base at full drift). Rounded to 1/20 so the value is stable from render to render
 * and the layout only re-runs when someone's drift visibly changes.
 */
export const DRIFT_OFFSET = 0.06;
export const driftStep = (level: number) => Math.round(level * 20) / 20;
