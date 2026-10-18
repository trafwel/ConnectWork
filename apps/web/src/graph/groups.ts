/**
 * Groups view (Oct 18, team request) — the pure part
 *
 * WHAT THIS ACHIEVES
 *   With 150+ people the map is busy. The Groups view collapses each tag (Work, School, …)
 *   into ONE node, sized by how many people it holds. Click a group to open it: its people
 *   appear where they'd be on the normal map. Links collapse too: lines between groups become
 *   one line whose thickness says how many connections it stands for.
 *
 * HOW IT FITS
 *   RingMap (grouped) → buildClusters() decides which groups are open and where each closed one
 *   sits → aggregateLinks() turns person-to-person links into what's visible. Pure, so tested
 *   (groups.test.ts). Positions come from the normal force layout, so a group sits at the centre
 *   of its members — in its own tag sector — and opening it doesn't move anybody.
 */
import type { Link, Person } from '@connectwork/shared';
import { NODE_RADIUS } from './layout';

export interface Cluster {
  tag: string;
  x: number;
  y: number;
  r: number;
  memberIds: string[];
}

export type Endpoint = { kind: 'group'; tag: string } | { kind: 'person'; id: string };

export interface GroupEdge {
  key: string;
  from: Endpoint;
  to: Endpoint;
  count: number;
  /** Any of the links behind it is still only an AI suggestion (drawn dashed). */
  suggested: boolean;
}

/** Area grows with the number of people, so a group of 100 isn't 10× wider than a group of 1. */
export const clusterRadius = (n: number) => 12 + 4 * Math.sqrt(n);

/** Room a group node needs beyond its radius: its outer ring and the dashed highlight (ClusterNode). */
const CLUSTER_HALO = 6;
/** Room a person needs beyond their radius: the selection ring (PersonNode). */
const PERSON_HALO = 5;
const YOU_RADIUS = 18; // RingMap's "You" node
const GAP = 6;

export interface Circle {
  x: number;
  y: number;
  r: number;
}

/**
 * Bug fix (Oct 18): a closed group sits at its members' centre, and a big group (126 people,
 * radius 57) could cover people who stay visible — the selected person, an open group's people,
 * "You" — or another group. Nudge each group node out of the way. People never move (they keep
 * their spot from the normal map, so opening a group doesn't shuffle anyone); only groups do,
 * a little at a time, until nothing overlaps or we run out of rounds (a very crowded map can
 * still touch, but it no longer hides anyone). Mutates and returns `clusters`.
 */
export function separateClusters<C extends Circle>(clusters: C[], fixed: Circle[], rounds = 80): C[] {
  for (let round = 0; round < rounds; round++) {
    let moved = false;
    clusters.forEach((c, i) => {
      for (const f of fixed) {
        const min = c.r + CLUSTER_HALO + f.r + GAP;
        const [dx, dy, d] = apart(c, f, i);
        if (d < min) {
          c.x += (dx / d) * (min - d);
          c.y += (dy / d) * (min - d);
          moved = true;
        }
      }
      for (let j = i + 1; j < clusters.length; j++) {
        const o = clusters[j]!;
        const min = c.r + o.r + 2 * CLUSTER_HALO + GAP;
        const [dx, dy, d] = apart(c, o, i);
        if (d < min) {
          const push = (min - d) / 2; // two groups share the move
          c.x += (dx / d) * push;
          c.y += (dy / d) * push;
          o.x -= (dx / d) * push;
          o.y -= (dy / d) * push;
          moved = true;
        }
      }
    });
    if (!moved) break;
  }
  return clusters;
}

/** Vector from b to a and its length; a fixed direction per group when they sit on the same spot. */
function apart(a: Circle, b: Circle, i: number): [number, number, number] {
  let dx = a.x - b.x;
  let dy = a.y - b.y;
  let d = Math.hypot(dx, dy);
  if (d < 1e-6) {
    const angle = i * 2.399; // the golden angle spreads groups that start on one point
    dx = Math.cos(angle);
    dy = Math.sin(angle);
    d = 1;
  }
  return [dx, dy, d];
}

/**
 * Closed groups (with their position and size) and the people who stay visible.
 * A group is open if the user opened it, or if it holds someone who must be seen (the selected
 * person: opening their card from the list or an AI answer must not leave them hidden).
 */
export function buildClusters(
  people: Person[],
  positions: Map<string, { x: number; y: number }>,
  expanded: ReadonlySet<string>,
  mustShow: ReadonlySet<string> = new Set(),
  /** Where "You" is drawn; when given, groups are also kept clear of it and of visible people. */
  center?: { x: number; y: number },
): { clusters: Cluster[]; visible: Person[]; groupOf: Map<string, string> } {
  const byTag = new Map<string, Person[]>();
  for (const p of people) {
    const list = byTag.get(p.primaryTag);
    if (list) list.push(p);
    else byTag.set(p.primaryTag, [p]);
  }
  const clusters: Cluster[] = [];
  const visible: Person[] = [];
  const groupOf = new Map<string, string>(); // person id → their CLOSED group's tag
  for (const [tag, members] of byTag) {
    const open = expanded.has(tag) || members.some((m) => mustShow.has(m.id));
    if (open) {
      visible.push(...members);
      continue;
    }
    const placed = members.map((m) => positions.get(m.id)).filter((p): p is { x: number; y: number } => Boolean(p));
    if (!placed.length) continue;
    const x = placed.reduce((s, p) => s + p.x, 0) / placed.length;
    const y = placed.reduce((s, p) => s + p.y, 0) / placed.length;
    clusters.push({ tag, x, y, r: clusterRadius(members.length), memberIds: members.map((m) => m.id) });
    for (const m of members) groupOf.set(m.id, tag);
  }
  if (center) {
    const fixed: Circle[] = [{ ...center, r: YOU_RADIUS }];
    for (const p of visible) {
      const pos = positions.get(p.id);
      if (pos) fixed.push({ ...pos, r: NODE_RADIUS[p.ring] + PERSON_HALO });
    }
    separateClusters(clusters, fixed);
  }
  return { clusters, visible, groupOf };
}

/**
 * Links as they look with some groups closed: person↔person when both are visible; otherwise
 * one edge per pair of endpoints (group or person) with a count. Links inside one closed group
 * disappear (the group already says "these belong together").
 */
export function aggregateLinks(links: Link[], groupOf: ReadonlyMap<string, string>): { personLinks: Link[]; edges: GroupEdge[] } {
  const personLinks: Link[] = [];
  const edges = new Map<string, GroupEdge>();
  const end = (id: string): Endpoint => {
    const tag = groupOf.get(id);
    return tag ? { kind: 'group', tag } : { kind: 'person', id };
  };
  const name = (e: Endpoint) => (e.kind === 'group' ? `g:${e.tag}` : `p:${e.id}`);
  for (const l of links) {
    const a = end(l.fromId);
    const b = end(l.toId);
    if (a.kind === 'person' && b.kind === 'person') {
      personLinks.push(l);
      continue;
    }
    if (a.kind === 'group' && b.kind === 'group' && a.tag === b.tag) continue;
    const [first, second] = name(a) < name(b) ? [a, b] : [b, a];
    const key = `${name(first)}|${name(second)}`;
    const edge = edges.get(key);
    if (edge) {
      edge.count++;
      edge.suggested ||= l.status === 'suggested';
    } else edges.set(key, { key, from: first, to: second, count: 1, suggested: l.status === 'suggested' });
  }
  return { personLinks, edges: [...edges.values()] };
}

/**
 * Declutter (Oct 18, from team screenshots): which person-to-person lines to draw.
 *   - Someone selected → only their lines (everything else is noise while you look at them).
 *   - Otherwise → lines between close people (rings 1–2), plus any line touching someone in
 *     focus (hovered, or named by an AI answer). The 100+ outer-ring imports keep their links,
 *     but those lines no longer criss-cross the whole map.
 */
export function linkIsShown(link: Pick<Link, 'fromId' | 'toId'>, ringOf: (id: string) => number | undefined, selectedId: string | null, focus: ReadonlySet<string>): boolean {
  const touches = (id: string) => link.fromId === id || link.toId === id;
  if (selectedId) return touches(selectedId);
  if (focus.has(link.fromId) || focus.has(link.toId)) return true;
  const a = ringOf(link.fromId);
  const b = ringOf(link.toId);
  return a !== undefined && b !== undefined && a <= 2 && b <= 2;
}

/** For a closed group's label: "connected to School (5), Friends (2)". */
export function groupConnections(tag: string, edges: GroupEdge[]): string {
  const counts = new Map<string, number>();
  for (const e of edges) {
    const mine = e.from.kind === 'group' && e.from.tag === tag ? e.to : e.to.kind === 'group' && e.to.tag === tag ? e.from : null;
    if (!mine) continue;
    const other = mine.kind === 'group' ? mine.tag : 'people outside groups';
    counts.set(other, (counts.get(other) ?? 0) + e.count);
  }
  return [...counts].map(([t, n]) => `${t} (${n})`).join(', ');
}

