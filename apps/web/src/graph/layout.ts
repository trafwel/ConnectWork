/**
 * M2 — Ring layout (d3-force) · done
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
 *      (Post-M6: so do people whose ring or tag changed, M6-I8.)
 *   4. In a useLayoutEffect (M2 review: useEffect painted one frame of empty rings) on
 *      [people, links, width, height] (skip when width/height is 0):
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
import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  forceCollide,
  forceLink,
  forceRadial,
  forceSimulation,
  forceX,
  forceY,
  type SimulationLinkDatum,
  type SimulationNodeDatum,
} from 'd3-force';
import type { Link, Person, Ring } from '@connectwork/shared';
import { PRIMARY_TAGS } from '@/lib/colors';

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

interface Node extends SimulationNodeDatum {
  id: string;
  ring: Ring;
  tag: string;
  offset: number;
}

export type Positions = Map<string, { x: number; y: number }>;

/** Positions plus the map size they were computed for (so callers can tell a stale layout). */
export interface Layout {
  positions: Positions;
  width: number;
  height: number;
}

export function geometry(width: number, height: number): Geometry {
  return { cx: width / 2, cy: height / 2, base: Math.min(width, height) };
}

/** Rings scale with the smaller side of the map, so all three always fit. */
export function ringRadius(g: Geometry, ring: Ring): number {
  return RING_FRACTION[ring] * g.base;
}

/**
 * Fix step 2 (drag a person to another ring): which ring a drop point belongs to. Each ring
 * owns the band halfway to its neighbours, so a drop near the dashed line always counts and
 * a drop between two rings goes to the nearer one. `d` = distance from the center, map units.
 */
export function ringForDistance(g: Geometry, d: number): Ring {
  const r1 = ringRadius(g, 1);
  const r2 = ringRadius(g, 2);
  const r3 = ringRadius(g, 3);
  if (d < (r1 + r2) / 2) return 1;
  if (d < (r2 + r3) / 2) return 2;
  return 3;
}

/** Oct 18: a person's saved drop spot, in map units. */
export function pinPoint(g: Geometry, pin: NonNullable<Person['pin']>): { x: number; y: number } {
  return { x: g.cx + pin.dist * g.base * Math.cos(pin.angle), y: g.cy + pin.dist * g.base * Math.sin(pin.angle) };
}

/** The inverse: a drop point → the pin to save. */
export function pinFor(g: Geometry, x: number, y: number): NonNullable<Person['pin']> {
  const dist = Math.min(1, Math.hypot(x - g.cx, y - g.cy) / g.base);
  return { angle: Math.atan2(y - g.cy, x - g.cx), dist };
}

/** Same primary tag → same direction, so groups read as clusters. Work starts at 12 o'clock. */
export function sectorAngle(tag: string): number {
  const i = PRIMARY_TAGS.indexOf(tag);
  const index = i === -1 ? PRIMARY_TAGS.length - 1 : i; // unknown/custom tags share the last sector
  return -Math.PI / 2 + (index / PRIMARY_TAGS.length) * 2 * Math.PI;
}

export function useForceLayout(
  people: Person[] | undefined,
  links: Link[] | undefined,
  width: number,
  height: number,
  offsetFor: (p: Person) => number = () => 0,
): Layout {
  const [layout, setLayout] = useState<Layout>({ positions: new Map(), width: 0, height: 0 });
  /** Last simulated node per id, so existing people restart from where they were. */
  const nodesRef = useRef<Map<string, Node>>(new Map());

  // Step 6. offsetFor is a new function every render; read the latest one from a ref.
  const offsetRef = useRef(offsetFor);
  useLayoutEffect(() => {
    offsetRef.current = offsetFor;
  });

  // Only what moves people: id, ring, tag, drift offset, and which links exist. useLiveQuery
  // hands us a new array on ANY change (e.g. editing notes), which must not re-run the layout.
  const layoutKey = useMemo(() => {
    if (!people || !links) return null;
    const pinKey = (x: Person) => (x.pin ? `@${x.pin.angle.toFixed(4)},${x.pin.dist.toFixed(4)}` : '');
    const p = people.map((x) => `${x.id}:${x.ring}:${x.primaryTag}:${offsetFor(x)}${pinKey(x)}`).join('|');
    const l = links.map((x) => `${x.fromId}-${x.toId}`).join('|');
    return `${p}#${l}`;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- offsetFor identity changes every render; its values are in the key
  }, [people, links]);

  const dataRef = useRef({ people, links });
  useLayoutEffect(() => {
    dataRef.current = { people, links };
  });

  // A layout effect, not useEffect: it runs before the browser paints, so the first visible
  // frame already has everyone placed (useEffect showed one frame of empty rings).
  useLayoutEffect(() => {
    const { people, links } = dataRef.current;
    if (layoutKey === null || !people || !links || width === 0 || height === 0) return;
    const g = geometry(width, height);
    const previous = nodesRef.current;

    // Step 3. Keep old x/y; new people start at their target spot with a little angle jitter.
    // M6-I8: someone whose ring or tag changed is placed fresh at their new spot (like a new
    // person); restarting from the old spot left re-tagged ring-3 people stuck in the old sector.
    let moved = 0;
    const nodes: Node[] = people.map((p) => {
      const offset = offsetRef.current(p);
      const old = previous.get(p.id);
      // Oct 18: a pinned person is fixed where the user dropped them (d3's fx/fy); everyone else
      // still flows around them, because fixed nodes keep colliding. Unpinning frees them.
      if (p.pin) {
        const at = pinPoint(g, p.pin);
        return Object.assign(old ?? { id: p.id }, { ring: p.ring, tag: p.primaryTag, offset, x: at.x, y: at.y, fx: at.x, fy: at.y });
      }
      if (old && (old.fx != null || old.fy != null)) Object.assign(old, { fx: null, fy: null });
      if (old && old.ring === p.ring && old.tag === p.primaryTag) return Object.assign(old, { offset });
      if (old) moved++;
      const r = ringRadius(g, p.ring) + offset;
      const a = sectorAngle(p.primaryTag) + (Math.random() - 0.5) * 0.9;
      return { id: p.id, ring: p.ring, tag: p.primaryTag, offset, x: g.cx + r * Math.cos(a), y: g.cy + r * Math.sin(a) };
    });
    nodesRef.current = new Map(nodes.map((n) => [n.id, n]));

    const ids = new Set(nodes.map((n) => n.id));
    const linkData = links.filter((l) => ids.has(l.fromId) && ids.has(l.toId)).map((l) => ({ source: l.fromId, target: l.toId }));
    const target = (n: Node) => {
      const r = ringRadius(g, n.ring) + n.offset;
      const a = sectorAngle(n.tag);
      return { x: g.cx + r * Math.cos(a), y: g.cy + r * Math.sin(a) };
    };

    // Step 4.
    // A small nudge when people already have spots; a full restart when many moved at once
    // (e.g. accepting a 112-person sort), so the crowd spreads out cleanly.
    const startAlpha = !previous.size || moved > 10 ? 1 : 0.3;
    const sim = forceSimulation<Node>(nodes)
      .force('radial', forceRadial<Node>((n) => ringRadius(g, n.ring) + n.offset, g.cx, g.cy).strength(1))
      .force('x', forceX<Node>((n) => target(n).x).strength((n) => SECTOR_PULL[n.ring]))
      .force('y', forceY<Node>((n) => target(n).y).strength((n) => SECTOR_PULL[n.ring]))
      .force('collide', forceCollide<Node>((n) => NODE_RADIUS[n.ring] + COLLIDE_PAD[n.ring]))
      .force(
        'link',
        forceLink<Node, SimulationLinkDatum<Node>>(linkData)
          .id((n) => n.id)
          .strength(0.02),
      )
      .alphaDecay(0.05)
      .alpha(startAlpha)
      .stop();

    // Step 5. Settle synchronously: stable on first paint, and independent of animation frames
    // (paused in background tabs). Ticks until alpha decays from startAlpha to alphaMin.
    sim.tick(Math.ceil(Math.log(sim.alphaMin() / startAlpha) / Math.log(1 - sim.alphaDecay())));
    setLayout({ positions: new Map(nodes.map((n) => [n.id, { x: n.x ?? g.cx, y: n.y ?? g.cy }])), width, height });
  }, [layoutKey, width, height]);

  return layout;
}
