/**
 * M3 — Ring picker · done (step S: built on the shared Segmented control)
 *
 * WHAT THIS ACHIEVES
 *   Choosing Close / Regular / Wider with mouse or keyboard — a proper radio group,
 *   which is what screen readers expect for "pick one of three".
 *
 * STEPS
 *   1. <div role="radiogroup" aria-label="Ring"> with three <button type="button" role="radio">,
 *      labelled "1 · Close", "2 · Regular", "3 · Wider".
 *   2. aria-checked={value === r}; roving tabIndex: 0 for the selected button, -1 for the others.
 *   3. Arrow keys move the selection: Right/Down → (r % 3) + 1; Left/Up → ((r + 1) % 3) + 1.
 *   4. Selected style: bg-primary text-primary-foreground; others muted with a hover background.
 *
 * Guide: §7.2
 */
import type { Ring } from '@connectwork/shared';
import { Segmented } from './Segmented';

const OPTIONS: Array<{ value: Ring; label: string }> = [
  { value: 1, label: '1 · Close' },
  { value: 2, label: '2 · Regular' },
  { value: 3, label: '3 · Wider' },
];

// Steps 1–4 live in Segmented (radio group, roving tabindex, arrow keys move focus too).
export function RingPicker({ value, onChange, id }: { value: Ring; onChange: (ring: Ring) => void; id?: string }) {
  return <Segmented id={id} label="Ring" value={value} options={OPTIONS} onChange={onChange} />;
}
