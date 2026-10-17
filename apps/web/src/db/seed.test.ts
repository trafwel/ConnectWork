import { describe, expect, it } from 'vitest';
import seed from '../../../../demo/seed.json';
import { materializeSeed } from './materialize';

describe('materializeSeed', () => {
  const now = new Date(2026, 9, 17);
  const { people, links, reminders } = materializeSeed(seed, now);

  it('turns offsets into dates relative to now', () => {
    const john = people.find((p) => p.id === 'p_john')!;
    expect(john.lastContact).toBe('2026-03-21');
    expect(reminders.find((r) => r.id === 'r_john')!.dueDate).toBe('2026-10-18');
  });

  it('keeps the demo story pair unlinked', () => {
    const pair = links.find(
      (l) => (l.fromId === 'p_abbey' && l.toId === 'p_john') || (l.fromId === 'p_john' && l.toId === 'p_abbey'),
    );
    expect(pair).toBeUndefined();
  });

  it('stores links with fromId < toId', () => {
    for (const l of links) expect(l.fromId < l.toId).toBe(true);
  });
});
