/**
 * M10 — Drift: relationships fading over time · Owner: Person A · ~20 min (+ wiring)
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

export const DEFAULT_THRESHOLDS: Record<Ring, number> = { 1: 90, 2: 180, 3: Infinity };

export function driftLevel(_person: Person, _now: Date = new Date(), _thresholds: Record<Ring, number> = DEFAULT_THRESHOLDS): number {
  // TODO(M10) step 1 (then steps 2–7 elsewhere)
  return 0;
}
