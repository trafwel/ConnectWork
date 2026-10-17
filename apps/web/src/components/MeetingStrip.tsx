/**
 * M11 — MeetingStrip: today's meetings above the map · Owner: Person A (UI) · ~30 min
 *
 * WHAT THIS ACHIEVES
 *   A glanceable row of today's and tomorrow's meetings with the faces you
 *   already know. Clicking one highlights those people on the map and opens a
 *   prep card. It makes the app useful every day, not just at import time.
 *
 * HOW IT FITS
 *   Below the TopBar in App.tsx. Reads db.meetings (useLiveQuery), filled by
 *   lib/googleCalendar.ts (real or sample). Click → setHighlights(attendeePersonIds)
 *   and rightPanel 'meeting' with the meeting id in the store.
 *
 * STEPS
 *   1. On mount: if connected → fetchMeetings(people) else loadSampleMeetings(people).
 *   2. Render chips: time ("3:30 PM" / "Tomorrow 11:00 AM"), title, initials of matched
 *      people. Label "Sample meetings" when not connected, with a "Connect Google Calendar" button.
 *   3. Chip click → setHighlights(meeting.attendeePersonIds); store selectedMeetingId;
 *      rightPanel 'meeting' (App renders <MeetingPrepCard />).
 *   4. Hide the strip when there are no meetings today or tomorrow.
 *
 * DONE WHEN
 *   - "Coffee with John" shows today; clicking it highlights John and opens the prep card.
 *
 * Guide: §18.3
 */

export function MeetingStrip() {
  // TODO(M11) steps 1–4
  return null;
}
