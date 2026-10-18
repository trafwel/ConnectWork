/**
 * Groups view (Oct 18) — one closed group on the map
 *
 * A circle in the tag's color, sized by how many people it holds, with the count inside (the
 * tag's NAME is drawn by the screen-space label layer, like people's names). Click or Enter/Space
 * opens it. It shows the same signals as a person, summed: a dashed highlight ring when an AI
 * answer names someone inside, and the screen-reader label says how many are highlighted,
 * due or drifting, so the map still answers questions while collapsed.
 */
import { memo } from 'react';
import type { Cluster } from './groups';
import { mapTheme as T } from './theme';
import { readableOn } from '@/lib/colors';

interface Props {
  cluster: Cluster;
  color: string;
  highlighted: number;
  due: number;
  drifting: number;
  dimmed: boolean;
  /** Declutter: another group is open, so this one steps back. */
  muted?: boolean;
  /** "School (5), Friends (2)": connections to other groups, in words instead of lines. */
  connections?: string;
  onToggle: (tag: string) => void;
}

function ClusterNodeImpl({ cluster, color, highlighted, due, drifting, dimmed, muted = false, connections, onToggle }: Props) {
  const n = cluster.memberIds.length;
  const extras = [highlighted && `${highlighted} in the answer`, due && `${due} with a follow-up due`, drifting && `${drifting} drifting`].filter(Boolean);
  const label = `${cluster.tag} group, ${n} ${n === 1 ? 'person' : 'people'}${extras.length ? `, ${extras.join(', ')}` : ''}${connections ? `; connected to ${connections}` : ''}. Click or press Enter to open.`;
  return (
    <g
      role="button"
      tabIndex={0}
      aria-label={label}
      aria-expanded={false}
      className="cursor-pointer outline-none [&:focus-visible>circle.focus]:opacity-100"
      style={{ opacity: dimmed ? 0.2 : muted ? 0.35 : 1, transform: `translate(${cluster.x}px, ${cluster.y}px)`, transition: 'opacity 200ms, transform 450ms ease-out' }}
      onClick={(e) => {
        e.stopPropagation(); // the map's own click clears the selection
        onToggle(cluster.tag);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onToggle(cluster.tag);
        }
      }}
    >
      <title>{label}</title>
      {/* Motion: the group node pops in when people gather into it (CSS keyframes in index.css). */}
      <g className="cw-pop">
      <circle className="focus" r={cluster.r + 6} fill="none" stroke={T.ink} strokeWidth={2} strokeDasharray="3 3" opacity={0} />
      {highlighted > 0 && <circle r={cluster.r + 5} fill="none" stroke={T.highlight} strokeWidth={2.5} strokeDasharray={T.highlightDash} />}
      {/* A soft outer ring says "there's more inside" without words. */}
      <circle r={cluster.r + 2.5} fill="none" stroke={color} strokeWidth={1.5} opacity={0.5} />
      <circle r={cluster.r} fill={color} stroke={T.nodeStroke} strokeWidth={T.nodeStrokeWidth} />
      <text textAnchor="middle" dy="0.35em" fontSize={Math.min(16, 9 + cluster.r / 5)} fontWeight={600} fontFamily={T.font} fill={readableOn(color)} pointerEvents="none">
        {n}
      </text>
      </g>
    </g>
  );
}

export const ClusterNode = memo(ClusterNodeImpl);
