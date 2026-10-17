import type { Link } from '@connectwork/shared';

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
      stroke={suggested ? 'var(--color-primary)' : '#64748b'}
      strokeWidth={suggested ? 1.5 : 1}
      strokeDasharray={suggested ? '5 4' : undefined}
      opacity={dimmed ? 0.06 : suggested ? 0.8 : 0.35}
      style={{ transition: 'opacity 200ms' }}
    >
      {link.label ? <title>{link.label}</title> : null}
    </line>
  );
}
