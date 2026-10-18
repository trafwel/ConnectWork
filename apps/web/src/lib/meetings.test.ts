import { describe, expect, it } from 'vitest';
import type { Link, Person, Reminder } from '@connectwork/shared';
import { buildBriefRequest, googleEventsToMeetings, isSampleMeeting, matchAttendees, meetingTimeLabel, nameFromEmail, reminderEventBody, sampleMeetings, upcoming } from './meetings';

const now = new Date(2026, 9, 17, 9, 0); // Sat Oct 17 2026, 9:00 local
const person = (id: string, name: string, over: Partial<Person> = {}): Person => ({ id, name, ring: 2, primaryTag: 'Work', tags: [], source: 'seed', createdAt: '', ...over });
const john = person('p_john', 'John Park', { email: 'John.Park@example.com', school: 'University of Washington', notes: 'Lab partner' });
const abbey = person('p_abbey', 'Abbey Chen', { company: 'Microsoft' });
const people = [john, abbey, person('p_a1', 'Sam Lee'), person('p_a2', 'Sam Lee')];

describe('matchAttendees', () => {
  it('matches by email (any case), then by an exact, unique name', () => {
    expect(matchAttendees([{ email: 'john.park@EXAMPLE.com' }, { displayName: 'Abbey Chen' }], people)).toEqual(['p_john', 'p_abbey']);
  });
  it('never guesses between namesakes, and lists a person once', () => {
    expect(matchAttendees([{ displayName: 'Sam Lee' }, { email: 'john.park@example.com', displayName: 'John Park' }, { email: 'john.park@example.com' }], people)).toEqual(['p_john']);
  });
});

describe('sampleMeetings', () => {
  it('places demo events relative to today and marks them as samples', () => {
    const [m] = sampleMeetings([{ id: 'e1', title: 'Coffee with John', dayOffset: 1, hour: 15, minute: 30, durationMin: 45, attendeeEmails: ['john.park@example.com'] }], people, now);
    expect(isSampleMeeting(m!)).toBe(true);
    expect(new Date(m!.start)).toEqual(new Date(2026, 9, 18, 15, 30));
    expect(new Date(m!.end)).toEqual(new Date(2026, 9, 18, 16, 15));
    expect(m!.attendeePersonIds).toEqual(['p_john']);
  });
});

describe('googleEventsToMeetings', () => {
  it('keeps timed, non-cancelled events and leaves the user out', () => {
    const out = googleEventsToMeetings(
      [
        { id: 'g1', summary: 'Coffee', start: { dateTime: '2026-10-17T15:30:00-07:00' }, end: { dateTime: '2026-10-17T16:00:00-07:00' }, attendees: [{ email: 'me@x.com', self: true }, { email: 'john.park@example.com' }] },
        { id: 'g2', summary: 'Follow up: John Park', start: { date: '2026-10-18' }, end: { date: '2026-10-19' } },
        { id: 'g3', status: 'cancelled', start: { dateTime: '2026-10-17T10:00:00-07:00' }, end: { dateTime: '2026-10-17T11:00:00-07:00' } },
      ],
      people,
    );
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ id: 'g1', title: 'Coffee', attendeeEmails: ['john.park@example.com'], attendeePersonIds: ['p_john'] });
  });
});

describe('reminderEventBody', () => {
  it('is an all-day event ending the next day (Google end dates are exclusive)', () => {
    const r: Reminder = { id: 'r', personId: 'p_john', dueDate: '2026-10-31', note: 'Send the article', done: false };
    expect(reminderEventBody(r, { ...john, linkedinUrl: 'https://www.linkedin.com/in/john' })).toEqual({
      summary: 'Follow up: John Park',
      description: 'Send the article\nhttps://www.linkedin.com/in/john',
      start: { date: '2026-10-31' },
      end: { date: '2026-11-01' },
    });
  });
});

describe('time labels and the window', () => {
  it('says the time today, "Tomorrow" tomorrow', () => {
    expect(meetingTimeLabel(new Date(2026, 9, 17, 15, 30).toISOString(), now)).toBe('3:30 PM');
    expect(meetingTimeLabel(new Date(2026, 9, 18, 11, 0).toISOString(), now)).toBe('Tomorrow 11:00 AM');
  });
  it('keeps only today and tomorrow, in order', () => {
    const at = (d: number, h: number) => ({ id: `${d}-${h}`, title: '', start: new Date(2026, 9, d, h).toISOString(), end: '', attendeeEmails: [], attendeePersonIds: [] });
    expect(upcoming([at(18, 9), at(16, 9), at(17, 8), at(19, 0)], now).map((m) => m.id)).toEqual(['17-8', '18-9']);
  });
});

describe('buildBriefRequest', () => {
  it('sends only attendees, links between them and their open reminders', () => {
    const meeting = { id: 'm', title: 'Sync', start: '2026-10-17T22:30:00.000Z', end: '', attendeeEmails: [], attendeePersonIds: ['p_john', 'p_abbey'] };
    const links: Link[] = [
      { id: 'l1', fromId: 'p_abbey', toId: 'p_john', label: 'both UW', source: 'user', status: 'accepted' },
      { id: 'l2', fromId: 'p_john', toId: 'p_other', source: 'user', status: 'accepted' },
      { id: 'l3', fromId: 'p_abbey', toId: 'p_john', source: 'ai', status: 'suggested' },
    ];
    const reminders: Reminder[] = [
      { id: 'r1', personId: 'p_john', dueDate: '2026-10-18', note: 'Career fair', done: false },
      { id: 'r2', personId: 'p_john', dueDate: '2026-10-01', note: 'Old', done: true },
      { id: 'r3', personId: 'p_other', dueDate: '2026-10-18', note: 'Not here', done: false },
    ];
    const req = buildBriefRequest(meeting, [john, abbey], links, reminders);
    expect(req.attendees.map((a) => a.id)).toEqual(['p_john', 'p_abbey']);
    expect(req.attendees[0]!.notes).toBe('Lab partner');
    expect(req.links).toEqual(['Abbey Chen — John Park (both UW)']);
    expect(req.reminders).toEqual(['John Park: Career fair (due 2026-10-18)']);
  });
});

it('nameFromEmail makes a starting name for unknown attendees', () => {
  expect(nameFromEmail('kai.larsen@example.com')).toBe('Kai Larsen');
  expect(nameFromEmail('jdoe@x.com')).toBe('Jdoe');
});
