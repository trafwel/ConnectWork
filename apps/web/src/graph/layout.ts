import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  forceCollide,
  forceLink,
  forceRadial,
  forceSimulation,
  forceX,
  forceY,
  type Simulation,
  type SimulationLinkDatum,
  type SimulationNodeDatum,
} from 'd3-force';
import type { Link, Person, Ring } from '@connectwork/shared';
import { PRIMARY_TAGS } from '@/lib/colors';

export const RING_FRACTION: Record<Ring, number> = { 1: 0.18, 2: 0.32, 3: 0.46 };
export const NODE_RADIUS: Record<Ring, number> = { 1: 22, 2: 14, 3: 6 };
/** Extra spacing so always-visible ring 1 labels don't collide. */
const COLLIDE_PAD: Record<Ring, number> = { 1: 20, 2: 7, 3: 3 };
/** Angle between the LinkedIn and Work sectors, kept free for ring labels. */
export const LABEL_ANGLE = -(2 / 3) * Math.PI;

export interface Geometry {
  cx: number;
  cy: number;
  /** min(width, height); ring radius = RING_FRACTION * base */
  base: number;
}

export function geometry(width: number, height: number): Geometry {
  return { cx: width / 2, cy: height / 2, base: Math.min(width, height) };
}

export const ringRadius = (g: Geometry, ring: Ring) => RING_FRACTION[ring] * g.base;

/** Same primary tag => same direction, so groups read as clusters. */
export function sectorAngle(tag: string): number {
  const i = PRIMARY_TAGS.indexOf(tag);
  const index = i === -1 ? PRIMARY_TAGS.length - 1 : i;
  return -Math.PI / 2 + (index / PRIMARY_TAGS.length) * 2 * Math.PI;
}

interface Node extends SimulationNodeDatum {
  id: string;
  ring: Ring;
  tag: string;
  offset: number;
}

export type Positions = Map<string, { x: number; y: number }>;

/**
 * Runs a d3-force simulation that pins each person to their ring radius
 * (plus an optional outward offset, used for drift) and pulls same-tag
 * people toward a shared angle. Existing positions are kept across data
 * changes so the map doesn't jump.
 */
export function useForceLayout(
  people: Person[] | undefined,
  links: Link[] | undefined,
  width: number,
  height: number,
  offsetFor: (p: Person) => number = () => 0,
): Positions {
  const [positions, setPositions] = useState<Positions>(new Map());
  const simRef = useRef<Simulation<Node, SimulationLinkDatum<Node>> | null>(null);
  const nodesRef = useRef<Map<string, Node>>(new Map());
  const offsetRef = useRef(offsetFor);
  useLayoutEffect(() => {
    offsetRef.current = offsetFor;
  });

  useEffect(() => {
    if (!people || !links || width === 0 || height === 0) return;
    const g = geometry(width, height);
    const previous = nodesRef.current;

    const nodes: Node[] = people.map((p) => {
      const old = previous.get(p.id);
      const offset = offsetRef.current(p);
      if (old) return Object.assign(old, { ring: p.ring, tag: p.primaryTag, offset });
      // New nodes start near their target spot with a little jitter.
      const r = ringRadius(g, p.ring) + offset;
      const a = sectorAngle(p.primaryTag) + (Math.random() - 0.5) * 0.9;
      return { id: p.id, ring: p.ring, tag: p.primaryTag, offset, x: g.cx + r * Math.cos(a), y: g.cy + r * Math.sin(a) };
    });
    nodesRef.current = new Map(nodes.map((n) => [n.id, n]));

    const ids = new Set(nodes.map((n) => n.id));
    const linkData = links
      .filter((l) => ids.has(l.fromId) && ids.has(l.toId))
      .map((l) => ({ source: l.fromId, target: l.toId }));

    const target = (n: Node) => {
      const r = ringRadius(g, n.ring) + n.offset;
      const a = sectorAngle(n.tag);
      return { x: g.cx + r * Math.cos(a), y: g.cy + r * Math.sin(a) };
    };

    simRef.current?.stop();
    const sim = forceSimulation<Node>(nodes)
      .force('radial', forceRadial<Node>((n) => ringRadius(g, n.ring) + n.offset, g.cx, g.cy).strength(0.9))
      .force('x', forceX<Node>((n) => target(n).x).strength(0.06))
      .force('y', forceY<Node>((n) => target(n).y).strength(0.06))
      .force('collide', forceCollide<Node>((n) => NODE_RADIUS[n.ring] + COLLIDE_PAD[n.ring]))
      .force(
        'link',
        forceLink<Node, SimulationLinkDatum<Node>>(linkData)
          .id((n) => n.id)
          .strength(0.02),
      )
      .alphaDecay(0.05)
      .alpha(previous.size ? 0.3 : 1)
      .stop();

    // Settle synchronously: the map appears stable on first paint, and it
    // does not depend on animation frames (paused in background tabs).
    // Nodes animate between layouts with a CSS transition instead.
    sim.tick(Math.ceil(Math.log(sim.alphaMin()) / Math.log(1 - sim.alphaDecay())));
    simRef.current = sim;
    setPositions(new Map(nodes.map((n) => [n.id, { x: n.x ?? g.cx, y: n.y ?? g.cy }])));
  }, [people, links, width, height]);

  return positions;
}
