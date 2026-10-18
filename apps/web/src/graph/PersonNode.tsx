/**
 * M2 — One person on the map · done; M7 added reminder flags (step T restyles it; M10 drift)
 *
 * WHAT THIS ACHIEVES
 *   Level of detail that keeps 150+ people readable: ring 1 shows initials and a
 *   name, ring 2 shows the name on hover/focus or when zoomed in, ring 3 is a dot
 *   until you zoom far in or it is selected, highlighted or a neighbor of the selection.
 *   (Since the Oct 17 fix RingMap draws the names, in screen space; see graph/labels.ts.)
 *
 * HOW IT FITS
 *   Rendered by RingMap; wrap in React.memo so only changed nodes re-render.
 *   M7 adds the reminder flag + pulse; M10 adds drift: fading to half opacity at full drift
 *   plus a dotted outline, and "drifting" in the screen-reader label.
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
 *   4. Name labels moved to RingMap's screen-space layer (bug fix, Oct 17: they overlapped and
 *      scaled with zoom). The node only reports hover/focus up (onHover) so the map can show
 *      that name first.
 *   5. Accessibility: role="button", tabIndex={0}, aria-label "Name, ring N, Tag, Company",
 *      aria-pressed={selected}; Enter/Space selects; onClick stops propagation; <title> for
 *      a native tooltip.
 *
 * FIX STEP 2 (Oct 17)
 *   - Reminder style: the node draws BOTH the flag (.cw-flag) and a ripple (.cw-ripple);
 *     <html data-reminders> (Settings → Appearance) decides in CSS which one shows.
 *   - Edit mode ("Move people"): pointerdown starts a drag in RingMap (onDragStart); keys
 *     1/2/3 move the focused person to that ring (onSetRing). `dragging` turns the position
 *     transition off, or the node would trail 450 ms behind the pointer.
 *
 * Guide: §6.2
 */
import { memo } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import type { Person, Ring } from '@connectwork/shared';
import { readableOn } from '@/lib/colors';
import { initials } from '@/lib/people';
import { NODE_RADIUS } from './layout';
import { mapTheme as T } from './theme';

interface Props {
  person: Person;
  x: number;
  y: number;
  color: string;
  selected: boolean;
  highlighted: boolean;
  dimmed: boolean;
  /** M7: a follow-up due within 7 days, or overdue. */
  flag?: 'due' | 'overdue';
  /** M10: 0 = in touch … 1 = twice past the limit (rounded to 1/20 by RingMap). */
  drift?: number;
  /** Declutter (Oct 18): an outer-ring person nobody is looking at: smaller, softer, no outline. */
  recede?: boolean;
  onSelect: (id: string) => void;
  /** Hover or keyboard focus, so RingMap shows this name even where it's crowded. */
  onHover: (id: string | null) => void;
  /** Fix step 2: "Move people" edit mode is on. */
  editing?: boolean;
  /** This node is being dragged: follow the pointer with no transition. */
  dragging?: boolean;
  onDragStart?: (id: string, e: ReactPointerEvent<SVGGElement>) => void;
  onSetRing?: (id: string, ring: Ring) => void;
}

function PersonNodeImpl({ person, x, y, color, selected, highlighted, dimmed, flag, drift = 0, recede = false, onSelect, onHover, editing, dragging, onDragStart, onSetRing }: Props) {
  const r = NODE_RADIUS[person.ring];
  // Polish (Oct 18, from a team screenshot): a grayed-out person drops every decoration (ripple,
  // flag, drift ring, highlight). Their pulsing halos were the clutter around a selection. The
  // screen-reader label still says "follow-up due" / "drifting".
  const quiet = dimmed && !selected;
  // Color is never the only signal: the flag's state is also in the label screen readers read.
  const flagText = flag === 'overdue' ? 'follow-up overdue' : flag === 'due' ? 'follow-up due' : undefined;
  // M10: "drifting" is in the label too; fading and the dotted outline are only the visual half.
  const description = [person.name, `ring ${person.ring}`, person.primaryTag, person.company, flagText, drift > 0 ? 'drifting' : undefined]
    .filter(Boolean)
    .join(', ');

  return (
    <g
      role="button"
      tabIndex={0}
      aria-label={description}
      aria-pressed={selected}
      aria-keyshortcuts={editing ? '1 2 3' : undefined}
      className={`${editing ? (dragging ? 'cursor-grabbing' : 'cursor-grab') + ' touch-none' : 'cursor-pointer'} outline-none [&:focus-visible>circle.focus]:opacity-100`}
      // Step 1: a CSS transform (not the x/y attributes) so layout changes animate.
      style={{
        // M10 step 5: fades to half at full drift. Polish (Oct 18): grayed-out people fade further.
        opacity: dimmed ? 0.12 : 1 - 0.5 * drift,
        transform: `translate(${x}px, ${y}px)`,
        transition: dragging ? 'opacity 200ms' : 'opacity 200ms, transform 450ms ease-out',
      }}
      onClick={(e) => {
        e.stopPropagation(); // the map's own click clears the selection
        onSelect(person.id);
      }}
      onPointerDown={editing && onDragStart ? (e) => e.button === 0 && onDragStart(person.id, e) : undefined}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect(person.id);
        } else if (editing && onSetRing && (e.key === '1' || e.key === '2' || e.key === '3')) {
          e.preventDefault();
          onSetRing(person.id, Number(e.key) as Ring);
        }
      }}
      onMouseEnter={() => onHover(person.id)}
      onMouseLeave={() => onHover(null)}
      onFocus={() => onHover(person.id)}
      onBlur={() => onHover(null)}
    >
      <title>{description}</title>
      <circle className="focus" r={r + 6} fill="none" stroke={T.ink} strokeWidth={2} strokeDasharray="3 3" opacity={0} />
      {highlighted && !selected && !quiet && <circle r={r + 5} fill="none" stroke={T.highlight} strokeWidth={2} strokeDasharray={T.highlightDash} />}
      {selected && <circle r={r + 4} fill="none" stroke={T.selected} strokeWidth={2.5} />}
      {/* M10 step 5: a dotted outline, so drift isn't shown by fading alone. */}
      {drift > 0 && !selected && !quiet && <circle r={r + 2.5} fill="none" stroke={T.ink} strokeWidth={1.2} strokeDasharray="2 3" pointerEvents="none" />}
      {/* M7: the pulse lives on this inner group, because the outer <g>'s transform is the position. */}
      <g className={flag && !quiet ? 'cw-pulse' : undefined}>
        <circle r={recede ? r * 0.8 : r} fill={color} fillOpacity={recede ? 0.55 : 1} stroke={recede ? 'none' : T.nodeStroke} strokeWidth={T.nodeStrokeWidth} />
      </g>
      {flag && !quiet && <Ripple r={r} overdue={flag === 'overdue'} />}
      {flag && !quiet && <Flag r={r} overdue={flag === 'overdue'} />}
      {person.ring === 1 && (
        <text textAnchor="middle" dy="0.35em" fontSize={11} fontWeight={600} fontFamily={T.font} fill={readableOn(color)} pointerEvents="none">
          {initials(person.name)}
        </text>
      )}
    </g>
  );
}

/**
 * Fix step 2: two rings that grow out of the node and fade (CSS in index.css). Overdue is
 * thicker as well as red, so color isn't the only difference. Hidden unless Reminders = Ripple.
 */
function Ripple({ r, overdue }: { r: number; overdue: boolean }) {
  const stroke = overdue ? 'var(--destructive)' : 'var(--map-ink)';
  const width = overdue ? 2.5 : 1.5;
  return (
    <g className="cw-ripple" pointerEvents="none" aria-hidden="true">
      <circle r={r + 1} fill="none" stroke={stroke} strokeWidth={width} />
      <circle r={r + 1} fill="none" stroke={stroke} strokeWidth={width} />
    </g>
  );
}

/** A small flag at the node's top-right: a pole and a pennant. Overdue = orange-red. */
function Flag({ r, overdue }: { r: number; overdue: boolean }) {
  const s = Math.max(6, r * 0.55);
  const x = r * 0.55;
  const y = -r * 0.95;
  const fill = overdue ? 'var(--destructive)' : 'var(--map-ink)';
  return (
    <g className="cw-flag" transform={`translate(${x} ${y})`} pointerEvents="none" aria-hidden="true">
      <line x1={0} y1={0} x2={0} y2={s * 1.6} stroke="var(--map-ink)" strokeWidth={1.2} />
      <path d={`M0 0 L${s} ${s * 0.4} L0 ${s * 0.8} Z`} fill={fill} stroke="var(--map-paper)" strokeWidth={0.75} />
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
    a.selected === b.selected &&
    a.highlighted === b.highlighted &&
    a.dimmed === b.dimmed &&
    a.flag === b.flag && // M7 (PX-I1: every new prop must be compared here)
    a.drift === b.drift && // M10
    a.recede === b.recede && // declutter
    a.onSelect === b.onSelect &&
    a.onHover === b.onHover &&
    a.editing === b.editing && // fix step 2
    a.dragging === b.dragging &&
    a.onDragStart === b.onDragStart &&
    a.onSetRing === b.onSetRing
  );
}

export const PersonNode = memo(PersonNodeImpl, sameNode);
