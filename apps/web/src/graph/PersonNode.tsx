/**
 * M2 — One person on the map · Owner: Person A · ~45 min
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
import type { Person } from '@connectwork/shared';

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

export function PersonNode(_props: Props) {
  // TODO(M2) steps 1–5
  return null;
}
