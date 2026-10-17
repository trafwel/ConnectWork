/**
 * M2 — Ring layout (d3-force) · Owner: Person A · ~1.5 h
 *
 * WHAT THIS ACHIEVES
 *   Places every person on their ring around "You", grouped by tag so groups read
 *   as shapes (Work at the top, then School, Friends, Family, Clubs, LinkedIn
 *   clockwise), with no overlaps and a stable picture that doesn't reshuffle when
 *   someone is added.
 *
 * HOW IT FITS
 *   RingMap calls useForceLayout(people, links, width, height, offsetFor) and gets
 *   { positions: Map<id, {x, y}>, width, height }. `width/height` tell RingMap which
 *   map size the positions were computed for (needed for centering on click).
 *   offsetFor(p) pushes a person outward (drift, M10).
 *
 * STEPS
 *   1. `pnpm --filter @connectwork/web add d3-force d3-zoom d3-selection framer-motion`
 *      and the matching @types/* as dev dependencies.
 *   2. Helpers: geometry(width, height) → { cx: width/2, cy: height/2, base: min(width, height) };
 *      ringRadius(g, ring) = RING_FRACTION[ring] * g.base;
 *      sectorAngle(tag) = -π/2 + (index of tag in PRIMARY_TAGS / PRIMARY_TAGS.length) * 2π
 *      (unknown tags use the last sector).
 *   3. useForceLayout: keep the last nodes in a ref (Map id → node) so existing people keep
 *      their x/y; NEW people start at their target spot with a little random angle jitter.
 *   4. In a useEffect on [people, links, width, height] (skip when width/height is 0):
 *        const target = (n) => point at ringRadius(n.ring) + n.offset, angle sectorAngle(n.tag)
 *        const sim = forceSimulation(nodes)
 *          .force('radial', forceRadial(n => ringRadius(g, n.ring) + n.offset, g.cx, g.cy).strength(1))
 *          .force('x', forceX(n => target(n).x).strength(n => SECTOR_PULL[n.ring]))
 *          .force('y', forceY(n => target(n).y).strength(n => SECTOR_PULL[n.ring]))
 *          .force('collide', forceCollide(n => NODE_RADIUS[n.ring] + COLLIDE_PAD[n.ring]))
 *          .force('link', forceLink(linkData).id(n => n.id).strength(0.02))
 *          .alphaDecay(0.05)
 *          .alpha(previousExists ? 0.3 : 1)
 *          .stop();
 *   5. SETTLE SYNCHRONOUSLY instead of animating tick by tick:
 *        sim.tick(Math.ceil(Math.log(sim.alphaMin()) / Math.log(1 - sim.alphaDecay())));
 *        setLayout({ positions: new Map(nodes.map(n => [n.id, { x: n.x, y: n.y }])), width, height });
 *      Why: the map is stable on first paint, and it works in background tabs, where
 *      browsers pause animation frames (our first version showed an EMPTY map there).
 *      Movement is animated by a CSS transform transition in PersonNode instead.
 *   6. offsetFor changes every render — keep it in a ref updated in useLayoutEffect, not
 *      read during render (the react-hooks lint rule will flag that).
 *   Tuning notes: COLLIDE_PAD is large for ring 1 because its names are always shown;
 *   SECTOR_PULL is weak for ring 3 so a 100+ person import spreads along the outer ring
 *   instead of piling inward across ring 2.
 *
 * DONE WHEN
 *   - The seed renders in three rings, clustered by tag, with no overlapping ring-1 names;
 *     after importing 114 people they stay on the outer ring.
 *
 * Guide: docs/IMPLEMENTATION_GUIDE.md §6.1
 */
import type { Link, Person, Ring } from '@connectwork/shared';

export const RING_FRACTION: Record<Ring, number> = { 1: 0.18, 2: 0.32, 3: 0.46 };
export const NODE_RADIUS: Record<Ring, number> = { 1: 22, 2: 14, 3: 6 };
/** Collision padding per ring, and pull toward the tag's angle (use these in step 4). */
export const COLLIDE_PAD: Record<Ring, number> = { 1: 20, 2: 7, 3: 1.5 };
export const SECTOR_PULL: Record<Ring, number> = { 1: 0.06, 2: 0.06, 3: 0.012 };
/** Default angle for ring labels: between the LinkedIn and Work sectors (upper left). */
export const LABEL_ANGLE = -(2 / 3) * Math.PI;

export interface Geometry {
  cx: number;
  cy: number;
  /** min(width, height); ring radius = RING_FRACTION * base */
  base: number;
}

export type Positions = Map<string, { x: number; y: number }>;

/** Positions plus the map size they were computed for (so callers can tell a stale layout). */
export interface Layout {
  positions: Positions;
  width: number;
  height: number;
}

export function geometry(_width: number, _height: number): Geometry {
  // TODO(M2) step 2
  return { cx: 0, cy: 0, base: 0 };
}

export function ringRadius(_g: Geometry, _ring: Ring): number {
  // TODO(M2) step 2
  return 0;
}

export function sectorAngle(_tag: string): number {
  // TODO(M2) step 2
  return 0;
}

export function useForceLayout(
  _people: Person[] | undefined,
  _links: Link[] | undefined,
  _width: number,
  _height: number,
  _offsetFor: (p: Person) => number = () => 0,
): Layout {
  // TODO(M2) steps 3–6
  return { positions: new Map(), width: 0, height: 0 };
}
