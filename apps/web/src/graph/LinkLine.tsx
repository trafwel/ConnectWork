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
}

export function LinkLine({ link, from, to, dimmed }: Props) {
  const suggested = link.status === 'suggested';
  return (
    <line
      x1={from.x}
      y1={from.y}
      x2={to.x}
      y2={to.y}
      stroke={suggested ? T.suggestedLink : T.link}
      strokeWidth={suggested ? 1.6 : T.linkWidth}
      strokeDasharray={suggested ? T.suggestedDash : undefined}
      opacity={dimmed ? 0.06 : suggested ? 0.9 : T.linkOpacity}
      style={{ transition: 'opacity 200ms' }}
    >
      {link.label ? <title>{link.label}</title> : null}
    </line>
  );
}
