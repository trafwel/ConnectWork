import { describe, expect, it } from 'vitest';
import type { Person, Reminder } from '@connectwork/shared';
import { icsFileName, remindersToIcs } from './ics';

const person = (over: Partial<Person> = {}): Person => ({ id: 'p_john', name: 'John Park', ring: 2, primaryTag: 'School', tags: [], source: 'seed', createdAt: '', ...over });
const reminder = (over: Partial<Reminder> = {}): Reminder => ({ id: 'r_1', personId: 'p_john', dueDate: '2026-10-18', note: 'Follow up after the career fair', done: false, ...over });

describe('remindersToIcs', () => {
  it('writes one all-day event per reminder on the right day', () => {
    const ics = remindersToIcs([
      { reminder: reminder(), person: person({ linkedinUrl: 'https://www.linkedin.com/in/john-park-demo' }) },
      { reminder: reminder({ id: 'r_2', dueDate: '2026-12-31' }), person: person({ name: 'Abbey Chen' }) },
    ]);
    expect(ics).toContain('BEGIN:VCALENDAR');
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(2);
    expect(ics).toContain('DTSTART;VALUE=DATE:20261018');
    expect(ics).toContain('DTEND;VALUE=DATE:20261019'); // end is exclusive: the next day
    expect(ics).toContain('DTEND;VALUE=DATE:20270101'); // across a year boundary
    expect(ics).toContain('SUMMARY:Follow up: John Park');
    expect(ics).toContain('UID:r_1@connectwork');
    expect(ics).not.toContain('DURATION'); // the library's "P1DT" is invalid; we always write DTEND
    expect(ics.replace(/\r\n[ \t]/g, '')).toContain('linkedin.com/in/john-park-demo'); // lines may be folded
  });

  it('cannot be tricked into extra events by text in a note or name', () => {
    const evil = 'hi\nEND:VEVENT\nBEGIN:VEVENT\nSUMMARY:Injected';
    const ics = remindersToIcs([{ reminder: reminder({ note: evil }), person: person({ name: 'Eve\nBEGIN:VEVENT' }) }]);
    expect(ics.match(/^BEGIN:VEVENT/gm)).toHaveLength(1);
    expect(ics).not.toMatch(/^SUMMARY:Injected/m);
  });
});

describe('icsFileName', () => {
  it('makes a safe file name', () => {
    expect(icsFileName('John Park')).toBe('connectwork-john-park.ics');
    expect(icsFileName('../../etc/passwd')).toBe('connectwork-etc-passwd.ics');
    expect(icsFileName('🙂')).toBe('connectwork-reminders.ics');
  });
});
