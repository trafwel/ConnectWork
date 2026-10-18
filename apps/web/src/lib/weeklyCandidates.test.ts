import { describe, expect, it } from 'vitest';
import type { Link } from '@connectwork/shared';
import seed from '../../../../demo/seed.json';
import { materializeSeed } from '../db/materialize';
import { weeklyCandidates } from './weeklyCandidates';

const now = new Date(2026, 9, 17);
const { people, links, reminders } = materializeSeed(seed, now);

describe('weeklyCandidates (demo data, fixed date)', () => {
  const c = weeklyCandidates(people, links, reminders, now);

  it('has John Park as BOTH a follow-up and a reconnect', () => {
    expect(c).toContainEqual(expect.objectContaining({ kind: 'follow_up', personId: 'p_john' }));
    expect(c).toContainEqual(expect.objectContaining({ kind: 'reconnect', personId: 'p_john', daysSinceContact: 210 }));
  });

  it('orders follow-ups (oldest first), then reconnects (most drifted first), then intros', () => {
    const kinds = c.map((x) => x.kind);
    expect(kinds.indexOf('reconnect')).toBeGreaterThan(kinds.lastIndexOf('follow_up'));
    expect(kinds.indexOf('intro')).toBeGreaterThan(kinds.lastIndexOf('reconnect'));
    const dues = c.flatMap((x) => (x.kind === 'follow_up' ? [x.dueDate] : []));
    expect(dues).toEqual([...dues].sort());
    expect(dues).toHaveLength(4);
  });

  it('finds intros only between people who share a company or school and are not linked', () => {
    const intros = c.flatMap((x) => (x.kind === 'intro' ? [x] : []));
    expect(intros.length).toBeGreaterThan(0);
    expect(intros.length).toBeLessThanOrEqual(5);
    const byId = new Map(people.map((p) => [p.id, p]));
    for (const i of intros) {
      const [a, b] = i.personIds.map((id) => byId.get(id)!);
      expect(a!.tags).toContain('intro');
      expect([a!.company, a!.school]).toContain(i.shared);
      expect([b!.company, b!.school]).toContain(i.shared);
      expect(links.some((l) => [l.fromId, l.toId].sort().join() === [a!.id, b!.id].sort().join())).toBe(false);
    }
  });

  it('is deterministic for a fixed date', () => {
    expect(weeklyCandidates(people, links, reminders, now)).toEqual(c);
  });

  it('includes suggested links and caps the total at 40', () => {
    const many: Link[] = Array.from({ length: 60 }, (_, i) => ({ id: `l_s${i}`, fromId: people[i % 40]!.id, toId: people[(i + 1) % 40]!.id, source: 'ai', status: 'suggested' }));
    const big = weeklyCandidates(people, [...links, ...many], reminders, now);
    expect(big).toHaveLength(40);
    expect(big.filter((x) => x.kind === 'accept_link').length).toBeGreaterThan(0);
  });
});
