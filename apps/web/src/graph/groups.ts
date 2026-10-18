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
