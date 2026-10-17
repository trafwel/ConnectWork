/**
 * M2 — A connection between two people · done
 *
 * WHAT THIS ACHIEVES
 *   Shows who knows whom. Accepted links are quiet solid lines; AI-suggested links
 *   (M6) are dashed in the accent color so they stand out until reviewed.
 *
 * Guide: §6.2
 */
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

export function LinkLine({ link, from, to, dimmed, emphasis = 'normal' }: Props) {
  const suggested = link.status === 'suggested';
  const baseOpacity = suggested ? 0.9 : T.linkOpacity;
  const opacity = emphasis === 'focus' ? 1 : emphasis === 'faint' ? 0.07 : dimmed ? 0.06 : baseOpacity;
  const width = emphasis === 'focus' ? (suggested ? 2.2 : 2) : suggested ? 1.6 : T.linkWidth;
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
