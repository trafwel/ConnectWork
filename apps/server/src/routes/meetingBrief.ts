/**
 * M11 — POST /api/ai/meeting-brief · Owner: Person B · ~25 min (route only)
 *
 * WHAT THIS ACHIEVES
 *   Before a meeting from Google Calendar (or the sample meetings), the user
 *   clicks it and gets a prep card: how they know each attendee, what to
 *   follow up on, and up to three talking points each. It connects the
 *   calendar to the network map — the "planning" half of our pitch.
 *
 * HOW IT FITS
 *   components/MeetingPrepCard.tsx sends only the matched attendees (with their
 *   notes), the links between them and their open reminders → this route →
 *   Gemini (MEETING_BRIEF_SYSTEM, thinking 'low') → the card renders it.
 *
 * STEPS
 *   1. Implement registerMeetingBrief() with one structured() call.
 *      parts: meeting title + start, attendees JSON, links and reminders as lines.
 *   2. post(): drop perPerson entries whose personId isn't an attendee id;
 *      cap talkingPoints at 3 (schema already does) and trim whitespace.
 *   3. Register it; test with a mocked generate (unknown personId dropped).
 *   4. Live check with the sample meeting "Coffee with John".
 *
 * DONE WHEN
 *   - The brief for John mentions the career-fair follow-up and UW.
 *
 * Contract: MeetingBriefRequest / MeetingBriefResponse · Guide: §18.3
 */
import type { Hono } from 'hono';
import type { AppDeps } from '../app';

export function registerMeetingBrief(_routes: Hono, _deps: AppDeps): void {
  // TODO(M11) 1: structured(_routes, _deps, { path: '/meeting-brief', request: MeetingBriefRequest,
  //   response: MeetingBriefResponse, system: MEETING_BRIEF_SYSTEM, thinking: 'low', parts: …, post: … })
  // TODO(M11) 2: register it from routes/ai.ts.
}
