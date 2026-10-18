import { describe, expect, it } from 'vitest';
import type { Candidate, Person } from '@connectwork/shared';
import { clip, digestText, resolvePerson, whichOne } from './textAgent';

const p = (id: string, name: string, company?: string): Person => ({ id, name, company, ring: 2, primaryTag: 'Work', tags: [], source: 'seed', createdAt: '' });
const people = [p('a', 'Abbey Chen', 'Microsoft'), p('j', 'John Park'), p('s1', 'Sam Lee', 'Acme'), p('s2', 'Sam Lee', 'Globex'), p('s3', 'Samira Khan')];

describe('resolvePerson (M16)', () => {
  it('finds one person by full name, by unique first name, or by a unique start', () => {
    expect(resolvePerson(' abbey  chen ', people)).toMatchObject({ kind: 'one', person: { id: 'a' } });
    expect(resolvePerson('Abbey', people)).toMatchObject({ kind: 'one', person: { id: 'a' } });
    expect(resolvePerson('John P', people)).toMatchObject({ kind: 'one', person: { id: 'j' } });
    expect(resolvePerson('Samira', people)).toMatchObject({ kind: 'one', person: { id: 's3' } });
  });
  it('asks when it is ambiguous, and says none when nobody matches', () => {
    const many = resolvePerson('Sam Lee', people);
    expect(many.kind).toBe('many');
    expect(whichOne(many.kind === 'many' ? many.people : [])).toBe('Which one: Sam Lee (Acme) or Sam Lee (Globex)?');
    expect(resolvePerson('Zed', people)).toEqual({ kind: 'none' });
    expect(resolvePerson('  ', people)).toEqual({ kind: 'none' });
  });
});

describe('digestText (M16)', () => {
  it('counts first, then names; never notes', () => {
    const c: Candidate[] = [
      { kind: 'follow_up', personId: 'j', reminderId: 'r', dueDate: '2026-10-19', note: 'secret note' },
      { kind: 'reconnect', personId: 'a', daysSinceContact: 200 },
      { kind: 'intro', personIds: ['a', 'j'], shared: 'UW' },
    ];
    const text = digestText(c, people);
    expect(text).toBe('This week: 1 follow-up due (John Park); 1 person to reconnect with (Abbey Chen); 1 possible intro. Open Connectwork to approve.');
    expect(text).not.toContain('secret');
    expect(digestText([], people)).toBe("You're all caught up this week.");
  });
});

it('clip keeps texts short', () => {
  expect(clip('a'.repeat(400))).toHaveLength(320);
  expect(clip('short')).toBe('short');
});
