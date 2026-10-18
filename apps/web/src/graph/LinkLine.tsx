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
  /** Motion: kept in the DOM but invisible, so showing it again fades it in. */
  hidden?: boolean;
}

function LinkLineImpl({ link, from, to, dimmed, emphasis = 'normal', hidden = false }: Props) {
  const suggested = link.status === 'suggested';
  // Polish (Oct 18): other people's lines almost vanish while someone is selected.
  const opacity = hidden ? 0 : emphasis === 'focus' ? 1 : emphasis === 'faint' ? 0.04 : dimmed ? 0.06 : suggested ? 0.9 : T.linkOpacity;
  const width = emphasis === 'focus' ? 2 : suggested ? 1.6 : T.linkWidth;
  // Motion (Oct 18): the line is a unit segment placed with a CSS transform (translate, rotate,
  // stretch), so when the layout moves it GLIDES with the people at its ends (they move with a
  // 450 ms CSS transition too) instead of jumping ahead of them. vector-effect keeps the stroke
  // width and dashes from being stretched along with it.
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.hypot(dx, dy) || 0.0001;
  const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
  return (
    <line
      x1={0}
      y1={0}
      x2={1}
      y2={0}
      stroke={suggested ? T.suggestedLink : T.link}
      strokeWidth={width}
      strokeDasharray={suggested ? T.suggestedDash : undefined}
      vectorEffect="non-scaling-stroke"
      opacity={opacity}
      style={{
        transform: `translate(${from.x}px, ${from.y}px) rotate(${angle}deg) scaleX(${length})`,
        transition: 'opacity 300ms, stroke-width 300ms, transform 450ms ease-out',
      }}
    >
      {link.label ? <title>{link.label}</title> : null}
    </line>
  );
}

export const LinkLine = memo(LinkLineImpl);
