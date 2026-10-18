/**
 * M11 — Meetings: the pure half of calendar sync and meeting prep
 *
 * WHAT THIS ACHIEVES
 *   Everything about meetings that needs no network or database: matching attendees to
 *   people, turning Google events (or the demo file) into Meeting rows, the body of a
 *   follow-up event, the chip's time label and the brief request. Pure, so it's tested
 *   (meetings.test.ts); lib/googleCalendar.ts does the fetching, MeetingStrip and
 *   MeetingPrepCard do the UI.
 *
 * WHY SPLIT IT OUT
 *   The Google side can only be tested with a real account (a human step), so the logic
 *   that decides what we show and send is kept apart and covered by unit tests.
 */
import type { Link, Meeting, MeetingBriefRequest, Person, Reminder } from '@connectwork/shared';
import { addDays, isoDate, localDate } from './dates';

/** Sample meetings from demo/calendar-events.json: times are offsets from today, like the seed. */
export interface SampleEvent {
  id: string;
  title: string;
  dayOffset: number;
  hour: number;
  minute: number;
  durationMin: number;
  attendeeEmails: string[];
}

/** The fields we read from a Google Calendar event (events.list). */
export interface GoogleEvent {
  id: string;
  status?: string;
  summary?: string;
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
  attendees?: Array<{ email?: string; displayName?: string; self?: boolean; responseStatus?: string }>;
}

/** Sample rows get this id prefix, so code (and the free-tier guard) can tell them apart. */
export const SAMPLE_PREFIX = 'sample_';
export const isSampleMeeting = (m: Pick<Meeting, 'id'>) => m.id.startsWith(SAMPLE_PREFIX);

const norm = (s?: string) => (s ?? '').trim().toLowerCase();

/**
 * Attendees → person ids: exact email first (lowercase), then an exact full-name match with the
 * calendar's display name. Each person at most once.
 */
export function matchAttendees(attendees: Array<{ email?: string; displayName?: string }>, people: Person[]): string[] {
  const byEmail = new Map(people.filter((p) => p.email).map((p) => [norm(p.email), p.id]));
  const byName = new Map<string, string | null>();
  for (const p of people) byName.set(norm(p.name), byName.has(norm(p.name)) ? null : p.id); // two namesakes → no guess
  const out = new Set<string>();
  for (const a of attendees) {
    const id = byEmail.get(norm(a.email)) ?? (a.displayName ? byName.get(norm(a.displayName)) : undefined);
    if (id) out.add(id);
  }
  return [...out];
}

/** Step 5 (googleCalendar.ts): demo events placed relative to `now`, attendees matched by email. */
export function sampleMeetings(events: SampleEvent[], people: Person[], now: Date = new Date()): Meeting[] {
  const today = localDate(isoDate(now));
  return events.map((e) => {
    const start = addDays(today, e.dayOffset);
    start.setHours(e.hour, e.minute, 0, 0);
    const end = new Date(start.getTime() + e.durationMin * 60_000);
    return {
      id: `${SAMPLE_PREFIX}${e.id}`,
      title: e.title,
      start: start.toISOString(),
      end: end.toISOString(),
      attendeeEmails: e.attendeeEmails.map(norm),
      attendeePersonIds: matchAttendees(
        e.attendeeEmails.map((email) => ({ email })),
        people,
      ),
    };
  });
}

/**
 * Step 4. Google events → Meeting rows. Skips cancelled events and all-day ones (those are
 * holidays, birthdays, and our own "Follow up: …" reminders, not meetings), and leaves the
 * user out of the attendee list.
 */
export function googleEventsToMeetings(items: GoogleEvent[], people: Person[]): Meeting[] {
  return items
    .filter((e) => e.status !== 'cancelled' && e.start?.dateTime && e.end?.dateTime)
    .map((e) => {
      const others = (e.attendees ?? []).filter((a) => !a.self);
      return {
        id: e.id,
        title: (e.summary ?? '(no title)').slice(0, 200),
        start: new Date(e.start!.dateTime!).toISOString(),
        end: new Date(e.end!.dateTime!).toISOString(),
        attendeeEmails: others.map((a) => norm(a.email)).filter(Boolean),
        attendeePersonIds: matchAttendees(others, people),
      };
    });
}

/** Step 6. A follow-up reminder as an all-day Google event (Google's end date is exclusive). */
export function reminderEventBody(reminder: Reminder, person: Person) {
  const description = [reminder.note, person.linkedinUrl].filter(Boolean).join('\n');
  return {
    summary: `Follow up: ${person.name}`,
    description,
    start: { date: reminder.dueDate },
    end: { date: isoDate(addDays(localDate(reminder.dueDate), 1)) },
  };
}

/** "3:30 PM" today, "Tomorrow 11:00 AM", otherwise "Mon 9:00 AM". */
export function meetingTimeLabel(startIso: string, now: Date = new Date()): string {
  const start = new Date(startIso);
  const time = start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  const day = isoDate(start);
  if (day === isoDate(now)) return time;
  if (day === isoDate(addDays(localDate(isoDate(now)), 1))) return `Tomorrow ${time}`;
  return `${start.toLocaleDateString('en-US', { weekday: 'short' })} ${time}`;
}

/** Only today's and tomorrow's meetings, in time order. */
export function upcoming(meetings: Meeting[], now: Date = new Date()): Meeting[] {
  const from = localDate(isoDate(now)).getTime();
  const to = addDays(localDate(isoDate(now)), 2).getTime();
  return meetings
    .filter((m) => {
      const t = new Date(m.start).getTime();
      return t >= from && t < to;
    })
    .sort((a, b) => a.start.localeCompare(b.start));
}

/**
 * MeetingPrepCard step 2. Only the matched attendees (with notes: the user asked for prep on
 * exactly these people), links BETWEEN attendees, and their open reminders.
 */
export function buildBriefRequest(meeting: Meeting, attendees: Person[], links: Link[], reminders: Reminder[]): MeetingBriefRequest {
  const ids = new Set(attendees.map((a) => a.id));
  const name = new Map(attendees.map((a) => [a.id, a.name]));
  return {
    meeting: { title: meeting.title, start: meeting.start },
    attendees: attendees.slice(0, 20).map((p) => ({
      id: p.id,
      name: p.name,
      company: p.company,
      role: p.role,
      school: p.school,
      metAt: p.metAt,
      notes: p.notes?.slice(0, 4000),
      lastContact: p.lastContact,
    })),
    links: links
      .filter((l) => l.status === 'accepted' && ids.has(l.fromId) && ids.has(l.toId))
      .slice(0, 50)
      .map((l) => `${name.get(l.fromId)} — ${name.get(l.toId)}${l.label ? ` (${l.label})` : ''}`),
    reminders: reminders
      .filter((r) => !r.done && ids.has(r.personId))
      .slice(0, 50)
      .map((r) => `${name.get(r.personId)}: ${r.note || 'follow up'} (due ${r.dueDate})`),
  };
}

/** "john.park@example.com" → "John Park": a starting name for "Add" on an unknown attendee. */
export function nameFromEmail(email: string): string {
  const local = email.split('@')[0] ?? email;
  return (
    local
      .split(/[._-]+/)
      .filter(Boolean)
      .map((w) => w[0]!.toUpperCase() + w.slice(1))
      .join(' ') || email
  );
}
