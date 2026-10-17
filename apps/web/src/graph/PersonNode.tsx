/**
 * M2 — One person on the map · done
 *
 * WHAT THIS ACHIEVES
 *   Level of detail that keeps 150+ people readable: ring 1 shows initials and a
 *   name, ring 2 shows the name on hover/focus or when zoomed in, ring 3 is a dot
 *   until you zoom far in or it is selected or highlighted.
 *
 * HOW IT FITS
 *   Rendered by RingMap; memoized so only changed nodes re-render. M7 adds the
 *   reminder flag and pulse; M10 adds drift fading.
 *
 * HOW IT WAS BUILT
 *   1. Position via CSS transform with a 450 ms transition (smooth moves).
 *   2. Selected = 3 px dark ring; highlighted = 2.5 px ring.
 *   3. Accessibility: <g role="button" tabIndex={0}> with an aria-label
 *      ("Name, ring N, Tag, Company"); Enter/Space selects; a dashed focus ring
 *      shows on keyboard focus; <title> gives a native tooltip.
 *
 * Guide: §6.2
 */
import { memo, useState } from 'react';
import type { Person } from '@connectwork/shared';
import { initials } from '@/lib/people';
import { readableOn } from '@/lib/colors';
import { NODE_RADIUS } from './layout';
import { mapTheme as T } from './theme';

interface Props {
  person: Person;
  x: number;
  y: number;
  color: string;
  zoom: number;
  selected: boolean;
  highlighted: boolean;
  dimmed: boolean;
  /** Connected to the selected person: always show the name. */
  neighbor?: boolean;
  onSelect: (id: string) => void;
}

function PersonNodeImpl({ person, x, y, color, zoom, selected, highlighted, dimmed, neighbor = false, onSelect }: Props) {
  const [hover, setHover] = useState(false);
  const r = NODE_RADIUS[person.ring];
  const showLabel =
    person.ring === 1 || selected || highlighted || neighbor || hover || (person.ring === 2 && zoom >= 1.3) || (person.ring === 3 && zoom >= 2.2);

  return (
    <g
      role="button"
      tabIndex={0}
      aria-label={`${person.name}, ring ${person.ring}, ${person.primaryTag}${person.company ? `, ${person.company}` : ''}`}
      aria-pressed={selected}
      className="cursor-pointer outline-none [&:focus-visible>circle.focus]:opacity-100"
      style={{
        opacity: dimmed ? 0.15 : 1,
        transform: `translate(${x}px, ${y}px)`,
        transition: 'opacity 200ms, transform 450ms ease-out',
      }}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(person.id);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect(person.id);
        }
      }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onFocus={() => setHover(true)}
      onBlur={() => setHover(false)}
    >
      <title>{`${person.name} · ${person.primaryTag}${person.company ? ` · ${person.company}` : ''}`}</title>
      {/* focus ring for keyboard users */}
      <circle className="focus" r={r + 6} fill="none" stroke={T.ink} strokeWidth={2} strokeDasharray="3 3" opacity={0} />
      {highlighted && !selected && (
        <circle r={r + 5} fill="none" stroke={T.highlight} strokeWidth={1.75} strokeDasharray={T.highlightDash} />
      )}
      {selected && <circle r={r + 4} fill="none" stroke={T.selected} strokeWidth={2.5} />}
      <circle r={r} fill={color} stroke={T.nodeStroke} strokeWidth={T.nodeStrokeWidth} />
      {person.ring === 1 && (
        <text textAnchor="middle" dy="0.35em" fontSize={11} fontWeight={500} fontFamily={T.mono} fill={readableOn(color)} pointerEvents="none">
          {initials(person.name)}
        </text>
      )}
      {showLabel && (
        <text
          y={r + 14}
          textAnchor="middle"
          fontSize={person.ring === 1 ? 12 : 11}
          fontWeight={person.ring === 1 || selected ? 600 : 500}
          fill={T.label}
          stroke={T.labelHalo}
          strokeWidth={4}
          paintOrder="stroke"
          pointerEvents="none"
        >
          {person.name}
        </text>
      )}
    </g>
  );
}

export const PersonNode = memo(PersonNodeImpl);
