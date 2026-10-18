/**
 * M10 step 7 — the drift limits the user set in Settings (or the defaults).
 *
 * WHY A HOOK: App, the person card, Ask Connectwork and the weekly review all need the same
 * limits. A live query means changing them in Settings updates the map, the Drifting tab and
 * the card at once, with no prop drilling. parseThresholds() checks the stored value.
 */
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/db';
import { DEFAULT_THRESHOLDS, parseThresholds, type Thresholds } from './drift';

export function useDriftThresholds(): Thresholds {
  // undefined while loading → defaults, so the first frame isn't empty.
  return useLiveQuery(async () => parseThresholds((await db.meta.get('driftThresholds'))?.value), []) ?? DEFAULT_THRESHOLDS;
}

/** For one-off reads outside React (Ask Connectwork, at ask time). */
export async function readDriftThresholds(): Promise<Thresholds> {
  return parseThresholds((await db.meta.get('driftThresholds'))?.value);
}
