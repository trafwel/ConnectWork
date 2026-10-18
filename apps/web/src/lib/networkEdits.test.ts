import { describe, expect, it } from 'vitest';
import type { Link, NetworkEdit, Person, Tag } from '@connectwork/shared';
import { planEdits } from './networkEdits';

const person = (id: string, name: string, ring: 1 | 2 | 3, primaryTag = 'Work'): Person => ({ id, name, ring, primaryTag, tags: [primaryTag], source: 'seed', createdAt: '' });
const people = [person('a', 'Abbey Chen', 2), person('j', 'John Park', 2, 'School'), person('t', 'Theo Xu', 1, 'Friends')];
const links: Link[] = [
  { id: 'l1', fromId: 'a', toId: 't', source: 'user', status: 'accepted' },
  { id: 'l2', fromId: 'j', toId: 't', source: 'ai', status: 'suggested' },
];
const tags = ['Work', 'School', 'Friends'].map((name) => ({ name, color: '#000' }) as Tag);
const e = (edit: Partial<NetworkEdit> & Pick<NetworkEdit, 'op'>): NetworkEdit => ({ personIds: [], ...edit });

describe('planEdits (search-bar edits)', () => {
  it('describes each change in words', () => {
    const plan = planEdits(
      [e({ op: 'add_link', personIds: ['a', 'j'], label: 'both UW' }), e({ op: 'set_ring', personIds: ['j'], ring: 1 }), e({ op: 'remove_suggested_links' })],
      people,
      links,
      tags,
    );
    expect(plan.map((p) => p.title)).toEqual(['Connect Abbey Chen ↔ John Park', 'Move John Park to close (ring 1)', 'Remove 1 suggested connection']);
  });
  it('drops changes that would change nothing', () => {
    const plan = planEdits(
      [
        e({ op: 'add_link', personIds: ['a', 't'] }), // already connected
        e({ op: 'remove_link', personIds: ['a', 'j'] }), // no such link
        e({ op: 'set_ring', personIds: ['t'], ring: 1 }), // already ring 1
        e({ op: 'set_tag', personIds: ['a'], tag: 'Spaceships' }), // not a group
        e({ op: 'add_person', name: 'abbey chen' }), // already on the map
      ],
      people,
      links,
      tags,
    );
    expect(plan).toEqual([]);
  });
  it('never pre-ticks removing a person', () => {
    const [plan] = planEdits([e({ op: 'remove_person', personIds: ['t'] })], people, links, tags);
    expect(plan).toMatchObject({ title: 'Remove Theo Xu from your map', checked: false });
  });
  it('fixes a tag to the group\'s real spelling', () => {
    const [plan] = planEdits([e({ op: 'set_tag', personIds: ['a'], tag: 'school' })], people, links, tags);
    expect(plan!.edit.tag).toBe('School');
  });
});
