/**
 * M3 — Ring picker · Owner: Person A · ~20 min
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

export function RingPicker(_props: { value: Ring; onChange: (ring: Ring) => void; id?: string }) {
  // TODO(M3) steps 1–4
  return null;
}
