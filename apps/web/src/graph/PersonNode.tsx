import { memo, useState } from 'react';
import type { Person } from '@connectwork/shared';
import { initials } from '@/lib/people';
import { NODE_RADIUS } from './layout';

interface Props {
  person: Person;
  x: number;
  y: number;
  color: string;
  zoom: number;
  selected: boolean;
  highlighted: boolean;
  dimmed: boolean;
  onSelect: (id: string) => void;
}

function PersonNodeImpl({ person, x, y, color, zoom, selected, highlighted, dimmed, onSelect }: Props) {
  const [hover, setHover] = useState(false);
  const r = NODE_RADIUS[person.ring];
  const showLabel =
    person.ring === 1 || selected || highlighted || hover || (person.ring === 2 && zoom >= 1.3) || (person.ring === 3 && zoom >= 2.2);

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
      <circle className="focus" r={r + 6} fill="none" stroke="#0f172a" strokeWidth={2} strokeDasharray="3 3" opacity={0} />
      {(selected || highlighted) && (
        <circle r={r + 4} fill="none" stroke="#0f172a" strokeWidth={selected ? 3 : 2.5} />
      )}
      <circle r={r} fill={color} stroke="white" strokeWidth={person.ring === 3 ? 1 : 2} />
      {person.ring === 1 && (
        <text textAnchor="middle" dy="0.35em" fontSize={12} fontWeight={600} fill="white" pointerEvents="none">
          {initials(person.name)}
        </text>
      )}
      {showLabel && (
        <text
          y={r + 14}
          textAnchor="middle"
          fontSize={person.ring === 1 ? 12 : 11}
          fontWeight={person.ring === 1 || selected ? 600 : 500}
          fill="#0f172a"
          stroke="white"
          strokeWidth={3}
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
