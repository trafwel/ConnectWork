/**
 * M2 — One person on the map · done (step T restyles it; M7 adds flags, M10 drift)
 *
 * WHAT THIS ACHIEVES
 *   Level of detail that keeps 150+ people readable: ring 1 shows initials and a
 *   name, ring 2 shows the name on hover/focus or when zoomed in, ring 3 is a dot
 *   until you zoom far in or it is selected, highlighted or a neighbor of the selection.
 *
 * HOW IT FITS
 *   Rendered by RingMap; wrap in React.memo so only changed nodes re-render.
 *   M7 adds the reminder flag + pulse; M10 adds drift fading.
 *
 * STEPS
 *   1. A <g> positioned with CSS: style={{ transform: `translate(${x}px, ${y}px)`,
 *      transition: 'opacity 200ms, transform 450ms ease-out', opacity: dimmed ? 0.15 : 1 }}
 *      (the CSS transition is what animates layout changes).
 *   2. r = NODE_RADIUS[ring]. Draw: a hidden dashed "focus" circle (r + 6) that becomes
 *      visible on :focus-visible; a selection ring (r + 4, 2.5–3 px); a highlight ring
 *      (dashed accent in Atlas); the node circle filled with the tag color.
 *   3. Ring 1: initials (lib/people.ts) centered, colored readableOn(color) (step T) so they
 *      always pass 4.5:1 contrast.
 *   4. Name label below the node when: ring 1, selected, highlighted, neighbor, hovered/focused,
 *      ring 2 and zoom ≥ 1.3, or ring 3 and zoom ≥ 2.2. Give it a halo
 *      (stroke = background, strokeWidth 3–4, paintOrder="stroke") and pointerEvents="none".
 *   5. Accessibility: role="button", tabIndex={0}, aria-label "Name, ring N, Tag, Company",
 *      aria-pressed={selected}; Enter/Space selects; onClick stops propagation; <title> for
 *      a native tooltip.
 *
 * Guide: §6.2
 */
import { memo, useState } from 'react';
import type { Person } from '@connectwork/shared';
import { readableOn } from '@/lib/colors';
import { initials } from '@/lib/people';
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
    person.ring === 1 ||
    selected ||
    highlighted ||
    neighbor ||
    hover ||
    (person.ring === 2 && zoom >= 1.3) ||
    (person.ring === 3 && zoom >= 2.2);
  const description = [person.name, `ring ${person.ring}`, person.primaryTag, person.company].filter(Boolean).join(', ');

  return (
    <g
      role="button"
      tabIndex={0}
      aria-label={description}
      aria-pressed={selected}
      className="cursor-pointer outline-none [&:focus-visible>circle.focus]:opacity-100"
      // Step 1: a CSS transform (not the x/y attributes) so layout changes animate.
      style={{ opacity: dimmed ? 0.15 : 1, transform: `translate(${x}px, ${y}px)`, transition: 'opacity 200ms, transform 450ms ease-out' }}
      onClick={(e) => {
        e.stopPropagation(); // the map's own click clears the selection
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
      <title>{description}</title>
      <circle className="focus" r={r + 6} fill="none" stroke={T.ink} strokeWidth={2} strokeDasharray="3 3" opacity={0} />
      {highlighted && !selected && <circle r={r + 5} fill="none" stroke={T.highlight} strokeWidth={2} strokeDasharray={T.highlightDash} />}
      {selected && <circle r={r + 4} fill="none" stroke={T.selected} strokeWidth={2.5} />}
      <circle r={r} fill={color} stroke={T.nodeStroke} strokeWidth={T.nodeStrokeWidth} />
      {person.ring === 1 && (
        <text textAnchor="middle" dy="0.35em" fontSize={11} fontWeight={600} fontFamily={T.font} fill={readableOn(color)} pointerEvents="none">
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

/**
 * useLiveQuery returns NEW person objects for everyone after any write, so a plain memo
 * would re-render every node. Compare only what a node draws (open-issues step, M3-E4).
 * ⚠ If you draw a new person field or add a prop (M7 flags, M10 drift), add it here too,
 *   or that node will not update.
 */
function sameNode(a: Props, b: Props): boolean {
  const p = a.person;
  const q = b.person;
  return (
    p.id === q.id &&
    p.name === q.name &&
    p.ring === q.ring &&
    p.primaryTag === q.primaryTag &&
    p.company === q.company &&
    a.x === b.x &&
    a.y === b.y &&
    a.color === b.color &&
    a.zoom === b.zoom &&
    a.selected === b.selected &&
    a.highlighted === b.highlighted &&
    a.dimmed === b.dimmed &&
    a.neighbor === b.neighbor &&
    a.onSelect === b.onSelect
  );
}

export const PersonNode = memo(PersonNodeImpl, sameNode);
