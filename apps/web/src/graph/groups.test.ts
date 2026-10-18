import { describe, expect, it } from 'vitest';
import type { Link, Person } from '@connectwork/shared';
import { aggregateLinks, buildClusters, clusterRadius, groupConnections, linkIsShown } from './groups';

const p = (id: string, tag: string): Person => ({ id, name: id, ring: 2, primaryTag: tag, tags: [tag], source: 'seed', createdAt: '' });
const people = [p('w1', 'Work'), p('w2', 'Work'), p('s1', 'School'), p('f1', 'Friends')];
const positions = new Map([
  ['w1', { x: 0, y: 0 }],
  ['w2', { x: 10, y: 20 }],
  ['s1', { x: 100, y: 100 }],
  ['f1', { x: -50, y: 0 }],
]);
const link = (id: string, a: string, b: string, status: Link['status'] = 'accepted'): Link => ({ id, fromId: a, toId: b, source: 'user', status });

describe('buildClusters', () => {
  it('collapses every closed tag into one node at its members’ centre, sized by count', () => {
    const { clusters, visible } = buildClusters(people, positions, new Set(['Friends']));
    const work = clusters.find((c) => c.tag === 'Work')!;
    expect(work).toMatchObject({ x: 5, y: 10, memberIds: ['w1', 'w2'], r: clusterRadius(2) });
    expect(clusters.map((c) => c.tag).sort()).toEqual(['School', 'Work']);
    expect(visible.map((v) => v.id)).toEqual(['f1']); // Friends is open
  });

  it('opens the group of someone who must be seen (the selected person)', () => {
    const { clusters, visible } = buildClusters(people, positions, new Set(), new Set(['s1']));
    expect(clusters.map((c) => c.tag)).not.toContain('School');
    expect(visible.map((v) => v.id)).toContain('s1');
  });
});

describe('aggregateLinks', () => {
  const { groupOf } = buildClusters(people, positions, new Set(['Friends']));
  it('keeps person↔person links, merges the rest by endpoint with a count, and drops links inside a group', () => {
    const { personLinks, edges } = aggregateLinks(
      [link('a', 'w1', 'w2'), link('b', 'w1', 's1'), link('c', 'w2', 's1', 'suggested'), link('d', 'f1', 'w1'), link('e', 'f1', 'w2')],
      groupOf,
    );
    expect(personLinks).toEqual([]);
    const workSchool = edges.find((e) => e.key === 'g:School|g:Work')!;
    expect(workSchool).toMatchObject({ count: 2, suggested: true });
    const friendWork = edges.find((e) => e.key === 'g:Work|p:f1')!;
    expect(friendWork).toMatchObject({ count: 2, suggested: false, from: { kind: 'group', tag: 'Work' }, to: { kind: 'person', id: 'f1' } });
    expect(edges).toHaveLength(2); // w1–w2 (inside Work) is gone
  });

  it('leaves links between visible people alone', () => {
    const open = buildClusters(people, positions, new Set(['Work', 'School', 'Friends']));
    expect(aggregateLinks([link('a', 'w1', 's1')], open.groupOf).personLinks).toHaveLength(1);
  });
});

describe('declutter rules', () => {
  const rings: Record<string, number> = { a: 1, b: 2, c: 3, d: 3 };
  const ringOf = (id: string) => rings[id];
  const l = (fromId: string, toId: string) => ({ fromId, toId });
  it('shows close-people lines by default, and outer-ring lines only in focus', () => {
    expect(linkIsShown(l('a', 'b'), ringOf, null, new Set())).toBe(true);
    expect(linkIsShown(l('a', 'c'), ringOf, null, new Set())).toBe(false);
    expect(linkIsShown(l('c', 'd'), ringOf, null, new Set(['d']))).toBe(true);
  });
  it('shows only the selected person\'s lines', () => {
    expect(linkIsShown(l('a', 'b'), ringOf, 'c', new Set())).toBe(false);
    expect(linkIsShown(l('c', 'd'), ringOf, 'c', new Set())).toBe(true);
  });
  it('summarizes a group\'s connections for its label', () => {
    const { groupOf } = buildClusters(people, positions, new Set(['Friends']));
    const { edges } = aggregateLinks([link('b', 'w1', 's1'), link('c', 'w2', 's1'), link('d', 'f1', 'w1')], groupOf);
    expect(groupConnections('Work', edges)).toBe('School (2), people outside groups (1)');
  });
});

