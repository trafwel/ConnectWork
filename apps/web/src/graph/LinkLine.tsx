/**
 * M2 — A connection between two people · done
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
import { memo } from 'react';
import type { Link } from '@connectwork/shared';
import { mapTheme as T } from './theme';

interface Props {
  link: Link;
  from: { x: number; y: number };
  to: { x: number; y: number };
  dimmed: boolean;
  /** 'focus' = touches the selected person; 'faint' = someone is selected but this link isn't theirs. */
  emphasis?: 'normal' | 'focus' | 'faint';
}

function LinkLineImpl({ link, from, to, dimmed, emphasis = 'normal' }: Props) {
  const suggested = link.status === 'suggested';
  const opacity = emphasis === 'focus' ? 1 : emphasis === 'faint' ? 0.07 : dimmed ? 0.06 : suggested ? 0.9 : T.linkOpacity;
  const width = emphasis === 'focus' ? 2 : suggested ? 1.6 : T.linkWidth;
  return (
    <line
      x1={from.x}
      y1={from.y}
      x2={to.x}
      y2={to.y}
      stroke={suggested ? T.suggestedLink : T.link}
      strokeWidth={width}
      strokeDasharray={suggested ? T.suggestedDash : undefined}
      opacity={opacity}
      style={{ transition: 'opacity 200ms, stroke-width 200ms' }}
    >
      {link.label ? <title>{link.label}</title> : null}
    </line>
  );
}

export const LinkLine = memo(LinkLineImpl);
