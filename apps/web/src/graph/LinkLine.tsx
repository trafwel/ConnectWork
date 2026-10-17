/**
 * M2 — A connection between two people · Owner: Person A · ~15 min
 *
 * WHAT THIS ACHIEVES
 *   Shows who knows whom. Accepted links are quiet solid lines; AI-suggested links
 *   (M6) are dashed in the accent color so they stand out until reviewed.
 *
 * STEPS
 *   1. A <line> from `from` to `to`.
 *   2. Accepted: thin (≈1 px) neutral stroke at ~35–40% opacity. Suggested: accent color,
 *      ~1.6 px, dashed ("5 4"; Atlas uses "8 4 2 4").
 *   3. Opacity by state: emphasis 'focus' → 1 and thicker (~2 px); 'faint' → ~0.07;
 *      dimmed (outside a filter/highlight) → ~0.06; otherwise the defaults above.
 *      transition: 'opacity 200ms, stroke-width 200ms'.
 *   4. If the link has a label, add <title>{label}</title> for a hover tooltip.
 *
 * Guide: §6.2
 */
import type { Link } from '@connectwork/shared';

interface Props {
  link: Link;
  from: { x: number; y: number };
  to: { x: number; y: number };
  dimmed: boolean;
  /** 'focus' = touches the selected person; 'faint' = someone is selected but this link isn't theirs. */
  emphasis?: 'normal' | 'focus' | 'faint';
}

export function LinkLine(_props: Props) {
  // TODO(M2) steps 1–4
  return null;
}
