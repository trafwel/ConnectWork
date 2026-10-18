/**
 * M11 — POST /api/ai/meeting-brief · done
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
import { MeetingBriefRequest, MeetingBriefResponse } from '@connectwork/shared';
import type { AppDeps } from '../app';
import { MEETING_BRIEF_SYSTEM } from '../prompts';
import { structured } from './structured';

export function registerMeetingBrief(routes: Hono, deps: AppDeps): void {
  // Step 1.
  structured(routes, deps, {
    path: '/meeting-brief',
    request: MeetingBriefRequest,
    response: MeetingBriefResponse,
    system: MEETING_BRIEF_SYSTEM,
    thinking: 'low',
    parts: (b) => [
      {
        text: [
          `Meeting: ${b.meeting.title} (starts ${b.meeting.start})`,
          `Attendees you know (JSON):\n${JSON.stringify(b.attendees)}`,
          `Links between attendees:\n${b.links.join('\n') || 'none'}`,
          `Open reminders:\n${b.reminders.join('\n') || 'none'}`,
        ].join('\n\n'),
      },
    ],
    // Step 2. Guardrail in code: one entry per real attendee, trimmed, no empty points.
    post: (res, b) => {
      const ids = new Set(b.attendees.map((a) => a.id));
      const seen = new Set<string>();
      return {
        summary: res.summary.trim(),
        perPerson: res.perPerson
          .filter((p) => ids.has(p.personId) && !seen.has(p.personId) && seen.add(p.personId))
          .map((p) => ({
            personId: p.personId,
            howYouKnow: p.howYouKnow.trim(),
            talkingPoints: p.talkingPoints.map((t) => t.trim()).filter(Boolean),
          })),
      };
    },
  });
}
