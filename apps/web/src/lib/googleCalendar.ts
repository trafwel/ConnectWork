/**
 * M11 — Google Calendar in the browser · Owner: Person B · ~1 h
 *
 * WHAT THIS ACHIEVES
 *   Connectwork reads today's and tomorrow's meetings and writes follow-up
 *   reminders back as calendar events — so the network map and the user's real
 *   schedule meet. Everything happens in the browser with a short-lived token;
 *   no calendar data ever reaches our server.
 *
 * HOW IT FITS
 *   Settings/MeetingStrip "Connect Google Calendar" → connectCalendar() →
 *   fetchMeetings() fills db.meetings → MeetingStrip shows them →
 *   MeetingPrepCard. "Add to calendar" calls createReminderEvent() when connected
 *   (lib/ics.ts otherwise).
 *
 * PREREQUISITES (human): Google Cloud OAuth client + test users → VITE_GOOGLE_CLIENT_ID in .env
 * (guide §2). Expect the "unverified app" screen; only listed test users can sign in.
 *
 * STEPS
 *   1. index.html: <script src="https://accounts.google.com/gsi/client" async defer></script>
 *      and `pnpm --filter @connectwork/web add -D @types/google.accounts`.
 *   2. connectCalendar(): google.accounts.oauth2.initTokenClient({ client_id, scope:
 *      'https://www.googleapis.com/auth/calendar.events', callback }) → requestAccessToken().
 *      Keep the token in the module variable ONLY (never IndexedDB/localStorage).
 *   3. gcal(path, init): fetch `https://www.googleapis.com/calendar/v3${path}` with
 *      Authorization: Bearer; on 401 → token = null and toast "Reconnect Google Calendar".
 *   4. fetchMeetings(): GET /calendars/primary/events?timeMin=<today 00:00>&timeMax=<tomorrow 23:59>
 *      &singleEvents=true&orderBy=startTime. Match attendees[].email (lowercase) to person.email,
 *      falling back to displayName === person.name. Save Meeting rows (db.meetings.bulkPut).
 *   5. loadSampleMeetings(): when not connected, turn demo/calendar-events.json (offsets from today,
 *      like the seed) into Meeting rows, so the demo works without sign-in.
 *   6. createReminderEvent(): POST /calendars/primary/events with
 *      { summary: `Follow up: ${name}`, description: note, start: { date }, end: { date: due + 1 day } };
 *      store the returned id in reminder.calendarEventId.
 *
 * DONE WHEN
 *   - Signed in: today's real meetings appear; a reminder shows up in Google Calendar.
 *   - Signed out: sample meetings appear, labelled as samples.
 *
 * Guide: §18.1–18.2
 */
import type { Meeting, Person, Reminder } from '@connectwork/shared';

// Access token, in memory only. connectCalendar() assigns it in M11.
// eslint-disable-next-line prefer-const -- reassigned once M11 is implemented
let token: string | null = null;

export const isCalendarConnected = () => token !== null;

export async function connectCalendar(): Promise<void> {
  // TODO(M11) step 2
  throw new Error('TODO(M11): connectCalendar is not implemented yet');
}

export async function fetchMeetings(_people: Person[]): Promise<Meeting[]> {
  // TODO(M11) steps 3–4
  throw new Error('TODO(M11): fetchMeetings is not implemented yet');
}

export async function loadSampleMeetings(_people: Person[], _now: Date = new Date()): Promise<Meeting[]> {
  // TODO(M11) step 5
  throw new Error('TODO(M11): loadSampleMeetings is not implemented yet');
}

export async function createReminderEvent(_reminder: Reminder, _person: Person): Promise<string> {
  // TODO(M11) step 6 — returns the Google event id
  throw new Error('TODO(M11): createReminderEvent is not implemented yet');
}
