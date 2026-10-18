/**
 * Bug fix (Oct 17): map labels that never overlap and stay readable at any zoom.
 *
 * WHAT THIS ACHIEVES
 *   Names used to live INSIDE the zoomed map: they grew and shrank with zoom and nothing
 *   stopped two from landing on top of each other. Now RingMap works out where each label
 *   belongs on the SCREEN (in pixels), and this module places them one by one, most
 *   important first, each in the first free spot around its anchor. A label with no free
 *   spot is skipped (it's still in the node's aria-label and shows on hover).
 *
 * HOW IT FITS
 *   RingMap → placeLabels(candidates, measure) → draws the placed labels in a screen-space
 *   <g> above everything. relationshipLabel() names a link for the selected person's lines.
 *   Pure functions, so they're unit-tested (labels.test.ts).
 */
import type { Link, Person } from '@connectwork/shared';

export interface LabelCandidate {
  id: string;
  text: string;
  /** Anchor in screen pixels (a node's center, a link's midpoint or a ring label's spot). */
  x: number;
  y: number;
  /** Screen radius of the node (0 for link and ring labels), so names sit outside the circle. */
  r: number;
  /** Higher goes first. */
  priority: number;
  /** 'name': around a node. 'link' (with a pill) and 'ring': centered on the anchor, nudged up or down. */
  kind: 'name' | 'link' | 'ring';
  bold?: boolean;
  /**
   * Polish (Oct 18): spots to try instead of the defaults, as offsets from (x, y). Link labels
   * pass points ALONG their own line, so two lines from one person don't stack their pills.
   */
  spots?: Array<[number, number]>;
}

export interface PlacedLabel extends LabelCandidate {
  /** Text center in screen pixels. */
  cx: number;
  cy: number;
  width: number;
  height: number;
}

export interface Box {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

const GAP = 3; // breathing room between labels, in px
const overlaps = (a: Box, b: Box, gap = GAP) => a.x0 < b.x1 + gap && b.x0 < a.x1 + gap && a.y0 < b.y1 + gap && b.y0 < a.y1 + gap;

export interface PlaceOptions {
  /** Line height in px. */
  height?: number;
  /** Placed even when every spot is taken (the selected or hovered person, ring labels). */
  force?: ReadonlySet<string>;
  /** Things labels should rather not cover (node circles). Tried first, then given up on. */
  obstacles?: Box[];
}

/**
 * Places labels greedily, most important first, each in the first free spot around its anchor.
 * Pass 1 avoids other labels AND nodes; pass 2 (only if pass 1 found nothing) avoids labels
 * only, because a name over a stranger's dot is better than no name. `measure` returns the
 * text width in px. Cost: O(labels × (labels + nodes)), about 1 ms for 150 people.
 */
export function placeLabels(candidates: LabelCandidate[], measure: (c: LabelCandidate) => number, options: PlaceOptions = {}): PlacedLabel[] {
  const { height = 14, force = new Set<string>(), obstacles = [] } = options;
  const placed: PlacedLabel[] = [];
  const boxes: Box[] = [];
  const sorted = [...candidates].sort((a, b) => b.priority - a.priority);

  for (const c of sorted) {
    const width = measure(c);
    const h = c.kind === 'link' ? height + 4 : height; // link labels have a pill around them
    const d = c.r + 3 + h / 2; // node center → label center, below/above
    const spots: Array<[number, number]> = c.spots?.length
      ? c.spots
      : c.kind === 'name'
        ? [
            [0, d], // below (the usual place)
            [0, -d], // above
            [c.r + 5 + width / 2, 0], // right
            [-(c.r + 5 + width / 2), 0], // left
          ]
        : [
            [0, 0],
            [0, -h - 2],
            [0, h + 2],
          ];
    const boxAt = ([dx, dy]: [number, number]): Box => ({
      x0: c.x + dx - width / 2,
      y0: c.y + dy - h / 2,
      x1: c.x + dx + width / 2,
      y1: c.y + dy + h / 2,
    });
    const free = (box: Box, avoidNodes: boolean) =>
      !boxes.some((b) => overlaps(b, box)) && (!avoidNodes || !obstacles.some((o) => overlaps(o, box, 0)));

    const chosen =
      spots.find((s) => free(boxAt(s), true)) ?? spots.find((s) => free(boxAt(s), false)) ?? (force.has(c.id) ? spots[0] : undefined);
    if (!chosen) continue;

    const box = boxAt(chosen);
    boxes.push(box);
    placed.push({ ...c, cx: c.x + chosen[0], cy: c.y + chosen[1], width, height: h });
  }
  return placed;
}

/** A circle as a box, for `obstacles`. */
export const circleBox = (x: number, y: number, r: number): Box => ({ x0: x - r, y0: y - r, x1: x + r, y1: y + r });

const same = (a?: string, b?: string) => Boolean(a && b && a.trim().toLowerCase() === b.trim().toLowerCase());
const SHORT_SCHOOL: Record<string, string> = { 'university of washington': 'UW' };
const shortSchool = (s: string) => SHORT_SCHOOL[s.trim().toLowerCase()] ?? s;

/**
 * The relationship to show on a line: the name the user (or the AI) gave the link, or else
 * what the two people have in common, or "connected".
 */
export function relationshipLabel(link: Pick<Link, 'label'>, a: Person, b: Person): string {
  if (link.label?.trim()) return link.label.trim();
  if (same(a.company, b.company)) return `both at ${a.company!.trim()}`;
  if (same(a.school, b.school)) return `both ${shortSchool(a.school!)}`;
  const shared = a.tags.find((t) => t !== 'LinkedIn' && b.tags.includes(t));
  if (shared) return `both ${shared}`;
  return 'connected';
}
