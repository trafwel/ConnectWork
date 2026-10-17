/**
 * M11 — MeetingPrepCard: who you're meeting and what to bring up · Owner: Person B · ~40 min
 *
 * WHAT THIS ACHIEVES
 *   Walk into any meeting prepared: how you know each attendee, their open
 *   reminders, links between them, and up to three talking points each. Then
 *   one tap logs the meeting, which resets drift for everyone in it.
 *
 * HOW IT FITS
 *   rightPanel === 'meeting' → this card → aiPost('/meeting-brief', …) with ONLY
 *   the matched attendees (notes included, because the user asked about them) →
 *   render. "Log this meeting" → logContact(id, 'meeting') for each attendee.
 *
 * STEPS
 *   1. Load the meeting and its attendees (db.meetings.get, db.people.bulkGet).
 *   2. Build the request: attendees (id, name, company, role, school, notes, lastContact),
 *      links between attendees as "A — B (label)" lines, their open reminders as lines.
 *   3. Call aiPost('/meeting-brief', body, MeetingBriefResponse); show "Preparing…"; errors → message.
 *   4. Render: title + time, summary, then per person: name (button → selectPerson),
 *      howYouKnow, talking points as a list, open reminders.
 *   5. "Log this meeting" button → logContact for each attendee → toast; drift resets.
 *   6. Attendees with no match in the network: list them as "Not in your network" with
 *      a quick "Add" button (addPerson with ring 3).
 *
 * DONE WHEN
 *   - John's brief mentions the career-fair follow-up and UW; logging it moves John
 *     back in from the drifting position.
 *
 * Guide: §18.3
 */

export function MeetingPrepCard(_props: { meetingId: string }) {
  // TODO(M11) steps 1–6
  return null;
}
