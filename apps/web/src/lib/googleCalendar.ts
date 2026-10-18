/**
 * M11 — Google Calendar in the browser · done
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
 *   (lib/ics.ts otherwise). The pure parts (matching, mapping, event bodies) are in
 *   lib/meetings.ts, with tests.
 *
 * PREREQUISITES (human): Google Cloud OAuth client + test users → VITE_GOOGLE_CLIENT_ID in .env
 * (guide §2). Expect the "unverified app" screen; only listed test users can sign in.
 *
 * STEPS (as built)
 *   1. Google's sign-in script is loaded ON DEMAND (first Connect click), not in index.html:
 *      nobody who never connects downloads Google code, and a CSP (M13) only needs to allow
 *      it for this one action. A few lines of types below replace @types/google.accounts
 *      (no new dependency).
 *   2. connectCalendar(): initTokenClient({ client_id, scope: calendar.events, callback }) →
 *      requestAccessToken(). The token lives in this module variable ONLY (never
 *      IndexedDB/localStorage), so a reload or closed tab forgets it.
 *   3. gcal(path, init): fetch with Authorization: Bearer; on 401 → forget the token and
 *      ask the user to reconnect.
 *   4. fetchMeetings(): events today 00:00 → end of tomorrow, mapped by lib/meetings.ts.
 *   5. loadSampleMeetings(): demo/calendar-events.json (a separate chunk) → sample rows.
 *   6. createReminderEvent(): POST an all-day "Follow up: name" event; returns its id.
 *
 * DONE WHEN
 *   - Signed in: today's real meetings appear; a reminder shows up in Google Calendar.
 *   - Signed out: sample meetings appear, labelled as samples.
 *
 * Guide: §18.1–18.2
 */
import type { Meeting, Person, Reminder } from '@connectwork/shared';
import { useStore } from '@/store/useStore';
import { addDays, isoDate, localDate } from './dates';
import { googleEventsToMeetings, reminderEventBody, sampleMeetings, type GoogleEvent, type SampleEvent } from './meetings';

// Step 1. Just the parts of Google Identity Services we call.
interface TokenResponse {
  access_token?: string;
  expires_in?: number;
  error?: string;
}
interface TokenClient {
  requestAccessToken: (overrides?: { prompt?: string }) => void;
}
interface GoogleAccounts {
  oauth2: {
    initTokenClient: (config: {
      client_id: string;
      scope: string;
      callback: (r: TokenResponse) => void;
      error_callback?: (e: { type: string }) => void;
    }) => TokenClient;
    revoke: (token: string, done?: () => void) => void;
  };
}
declare global {
  interface Window {
    google?: { accounts: GoogleAccounts };
  }
}

const SCOPE = 'https://www.googleapis.com/auth/calendar.events';
const API = 'https://www.googleapis.com/calendar/v3';
export const CLIENT_ID: string = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? '';
export const calendarConfigured = () => CLIENT_ID.length > 0;

// Step 2. In memory only. expiresAt lets us treat an expired token as "not connected".
let token: { value: string; expiresAt: number } | null = null;

export const isCalendarConnected = () => token !== null && Date.now() < token.expiresAt;

function setConnected(t: typeof token) {
  token = t;
  useStore.getState().setCalendarConnected(t !== null); // UI state: a boolean, never the token
}

let gsi: Promise<GoogleAccounts> | null = null;
/** Memoized: many clicks, one script tag. A failed load clears the promise so a retry can work. */
function loadGsi(): Promise<GoogleAccounts> {
  gsi ??= new Promise<GoogleAccounts>((resolve, reject) => {
    if (window.google?.accounts) return resolve(window.google.accounts);
    const s = document.createElement('script');
    s.src = 'https://accounts.google.com/gsi/client';
    s.async = true;
    s.onload = () => (window.google?.accounts ? resolve(window.google.accounts) : reject(new Error('Google sign-in did not load')));
    s.onerror = () => reject(new Error('Could not reach Google sign-in'));
    document.head.appendChild(s);
  }).catch((e: unknown) => {
    gsi = null;
    throw e;
  });
  return gsi;
}

/** Step 2. Resolves once the user granted access; rejects if they closed the popup or said no. */
export async function connectCalendar(): Promise<void> {
  if (!calendarConfigured()) throw new Error('Google Calendar is not set up: add VITE_GOOGLE_CLIENT_ID to .env');
  const accounts = await loadGsi();
  await new Promise<void>((resolve, reject) => {
    const client = accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: SCOPE,
      callback: (r) => {
        if (r.error || !r.access_token) return reject(new Error(r.error ?? 'No access was granted'));
        // A minute of margin so a request never starts with a token about to expire.
        setConnected({ value: r.access_token, expiresAt: Date.now() + ((r.expires_in ?? 3600) - 60) * 1000 });
        resolve();
      },
      error_callback: (e) => reject(new Error(e.type === 'popup_closed' ? 'The Google window was closed' : 'Google sign-in failed')),
    });
    client.requestAccessToken();
  });
}

/** Forget the token here AND tell Google to revoke it. */
export function disconnectCalendar(): void {
  const t = token?.value;
  setConnected(null);
  if (t) window.google?.accounts.oauth2.revoke(t);
}

export class CalendarAuthError extends Error {}

/** Step 3. Every Calendar API call. 401 = expired or revoked: forget it, the UI offers Reconnect. */
async function gcal<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (!isCalendarConnected()) {
    setConnected(null);
    throw new CalendarAuthError('Reconnect Google Calendar');
  }
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: { ...init.headers, Authorization: `Bearer ${token!.value}`, 'Content-Type': 'application/json' },
  });
  if (res.status === 401) {
    setConnected(null);
    throw new CalendarAuthError('Reconnect Google Calendar');
  }
  if (!res.ok) throw new Error(`Google Calendar answered ${res.status}`);
  return (await res.json()) as T;
}

/** Step 4. Today and tomorrow, local time. */
export async function fetchMeetings(people: Person[], now: Date = new Date()): Promise<Meeting[]> {
  const from = localDate(isoDate(now));
  const to = addDays(from, 2);
  const q = new URLSearchParams({ timeMin: from.toISOString(), timeMax: to.toISOString(), singleEvents: 'true', orderBy: 'startTime', maxResults: '50' });
  const data = await gcal<{ items?: GoogleEvent[] }>(`/calendars/primary/events?${q}`);
  return googleEventsToMeetings(data.items ?? [], people);
}

/** Step 5. A separate chunk, like the seed: only fetched when samples are shown. */
export async function loadSampleMeetings(people: Person[], now: Date = new Date()): Promise<Meeting[]> {
  const { default: events } = (await import('../../../../demo/calendar-events.json')) as { default: SampleEvent[] };
  return sampleMeetings(events, people, now);
}

/** Step 6. Returns the Google event id (saved as reminder.calendarEventId). */
export async function createReminderEvent(reminder: Reminder, person: Person): Promise<string> {
  const event = await gcal<{ id: string }>('/calendars/primary/events', { method: 'POST', body: JSON.stringify(reminderEventBody(reminder, person)) });
  return event.id;
}
