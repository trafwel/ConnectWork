import { describe, expect, it } from 'vitest';
import type { Candidate, Person, Reminder } from '@connectwork/shared';
import { clip, digestText, dueText, resolvePerson, whichOne } from './textAgent';

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

describe('dueText (Oct 18: Photon texts you when something is due)', () => {
  const now = new Date(2026, 9, 18, 9);
  const who: Person[] = [
    { id: 'j', name: 'John Park', ring: 2, primaryTag: 'School', tags: ['School'], source: 'seed', createdAt: '' },
    { id: 'm', name: 'Maya Varga', ring: 1, primaryTag: 'Family', tags: ['Family'], source: 'seed', createdAt: '' },
  ];
  const r = (id: string, personId: string, dueDate: string, done = false): Reminder => ({ id, personId, dueDate, note: 'private note', done });
  it('lists what is due today and how late the rest is, without the notes', () => {
    const text = dueText([r('1', 'j', '2026-10-18'), r('2', 'm', '2026-10-16'), r('3', 'm', '2026-10-25')], who, now)!;
    expect(text).toBe('Due today: John Park. Overdue: Maya Varga (2 days late). Open Connectwork to follow up.');
    expect(text).not.toContain('private note');
  });
  it('says nothing when nothing is due, or it is done', () => {
    expect(dueText([r('1', 'j', '2026-10-20'), r('2', 'm', '2026-10-10', true)], who, now)).toBeNull();
  });
});
