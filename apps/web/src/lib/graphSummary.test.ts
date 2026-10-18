// ACCEPTANCE TESTS for M5 (lib/graphSummary.ts).
// These are skipped until you build that milestone. They describe exactly what
// "done" means: when you finish it, change every `describe(` below back to
// `describe(` and run `pnpm test` — they should all pass.
import { describe, expect, it } from 'vitest';
import type { Link, Person, Reminder } from '@connectwork/shared';
import { buildSummary } from './graphSummary';

const p = (over: Partial<Person>): Person => ({
  id: 'p_a',
  name: 'Ada',
  ring: 2,
  primaryTag: 'Work',
  tags: ['Work'],
  source: 'manual',
  createdAt: '',
  ...over,
});

describe('buildSummary', () => {
  it('writes one P line per person and leaves notes out', () => {
    const s = buildSummary([p({ company: 'Acme|Corp', notes: 'secret note', lastContact: '2026-10-01' })], [], []);
    expect(s).toBe('P|p_a|Ada|2|Work|Work|Acme / Corp|||2026-10-01|');
    expect(s).not.toContain('secret');
  });

  it('includes accepted links and open reminders only', () => {
    const people = [p({}), p({ id: 'p_b', name: 'Bo' })];
    const s = buildSummary(
      people,
      [
        { id: 'l1', fromId: 'p_a', toId: 'p_b', label: 'team', source: 'user', status: 'accepted' },
        { id: 'l2', fromId: 'p_a', toId: 'p_b', source: 'ai', status: 'suggested' },
        { id: 'l3', fromId: 'p_a', toId: 'p_gone', source: 'user', status: 'accepted' },
      ],
      [
        { id: 'r1', personId: 'p_b', dueDate: '2026-10-20', note: 'ping\nsoon', done: false },
        { id: 'r2', personId: 'p_b', dueDate: '2026-10-21', note: 'done one', done: true },
      ],
    );
    expect(s.split('\n').filter((l) => l.startsWith('L|'))).toEqual(['L|p_a|p_b|team']);
    expect(s.split('\n').filter((l) => l.startsWith('R|'))).toEqual(['R|p_b|2026-10-20|ping / soon']);
  });
});

describe('buildSummary order (polish)', () => {
  it('is the same whatever order the database returns rows in', () => {
    const people: Person[] = [
      { id: 'p_b', name: 'B', ring: 2, primaryTag: 'Work', tags: ['Work'], source: 'seed', createdAt: '' },
      { id: 'p_a', name: 'A', ring: 1, primaryTag: 'Work', tags: ['Work'], source: 'seed', createdAt: '' },
    ];
    const links: Link[] = [
      { id: 'l_zzz', fromId: 'p_a', toId: 'p_b', source: 'ai', status: 'accepted', label: 'x' },
      { id: 'l_aaa', fromId: 'p_a', toId: 'p_c', source: 'ai', status: 'accepted' },
    ];
    const reminders: Reminder[] = [
      { id: 'r_2', personId: 'p_b', dueDate: '2026-10-20', note: 'b', done: false },
      { id: 'r_1', personId: 'p_a', dueDate: '2026-10-19', note: 'a', done: false },
    ];
    expect(buildSummary([...people].reverse(), [...links].reverse(), [...reminders].reverse())).toBe(buildSummary(people, links, reminders));
  });
});

