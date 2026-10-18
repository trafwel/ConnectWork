/**
 * M11 — MeetingPrepCard: who you're meeting and what to bring up · done
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
 *   2. Build the request with lib/meetings.ts buildBriefRequest (tested): attendees, links
 *      between them, their open reminders.
 *   3. Call aiPost('/meeting-brief', body, MeetingBriefResponse); "Preparing…"; errors → message.
 *      Free tier + a REAL calendar meeting → no call (real people's notes must not go to the
 *      free tier); the card says so. Briefs are cached per meeting + attendees for the session.
 *   4. Render: title + time, summary, then per person: name (button → selectPerson),
 *      howYouKnow, talking points as a list, open reminders.
 *   5. "Log this meeting" button → logContact for each attendee → toast; drift resets.
 *   6. Attendees with no match in the network: "Not in your network" with a quick "Add"
 *      (addPerson, ring 3) that also attaches them to this meeting.
 *
 * DONE WHEN
 *   - John's brief mentions the career-fair follow-up and UW; logging it moves John
 *     back in from the drifting position.
 *
 * Guide: §18.3
 */
import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { UserPlus, X } from 'lucide-react';
import { toast } from 'sonner';
import { MeetingBriefResponse, type Person } from '@connectwork/shared';
import { Button } from '@/components/ui/button';
import { addMeetingAttendee, addPerson, logContact } from '@/db/actions';
import { db } from '@/db/db';
import { aiPost, getHealth } from '@/lib/api';
import { buildBriefRequest, isSampleMeeting, meetingTimeLabel, nameFromEmail } from '@/lib/meetings';
import { sectionHeading } from '@/lib/utils';
import { useStore } from '@/store/useStore';

type Brief = { status: 'loading' } | { status: 'ready'; data: MeetingBriefResponse } | { status: 'error'; message: string } | { status: 'blocked' };

/** One brief per meeting + attendee set per session: reopening a card costs no AI call. */
const briefs = new Map<string, MeetingBriefResponse>();

export function MeetingPrepCard({ meetingId }: { meetingId: string }) {
  const selectPerson = useStore((s) => s.selectPerson);
  const clearFocus = useStore((s) => s.clearFocus);

  // Step 1. One live query for everything the card shows.
  const data = useLiveQuery(async () => {
    const meeting = await db.meetings.get(meetingId);
    if (!meeting) return null;
    const attendees = (await db.people.bulkGet(meeting.attendeePersonIds)).filter((p): p is Person => Boolean(p));
    const ids = attendees.map((p) => p.id);
    const [links, reminders] = await Promise.all([
      db.links.where('fromId').anyOf(ids).toArray(),
      db.reminders.where('personId').anyOf(ids).filter((r) => !r.done).toArray(),
    ]);
    const known = new Set(attendees.map((p) => p.email?.toLowerCase()).filter(Boolean));
    const unknown = meeting.attendeeEmails.filter((e) => !known.has(e));
    return { meeting, attendees, links, reminders, unknown };
  }, [meetingId]);

  const [brief, setBrief] = useState<Brief>({ status: 'loading' });
  const [logged, setLogged] = useState(false);
  const briefKey = data ? `${meetingId}|${data.attendees.map((p) => p.id).join(',')}` : null;

  // Steps 2–3. Only async results are set here (the initial state is already "loading").
  useEffect(() => {
    if (!data || !briefKey) return;
    let alive = true;
    void (async () => {
      const cached = briefs.get(briefKey);
      if (cached) return alive && setBrief({ status: 'ready', data: cached });
      if (!data.attendees.length) return alive && setBrief({ status: 'error', message: 'Nobody in this meeting is in your network yet.' });
      const health = await getHealth();
      if (health?.tier === 'free' && !isSampleMeeting(data.meeting)) return alive && setBrief({ status: 'blocked' });
      const res = await aiPost('/meeting-brief', buildBriefRequest(data.meeting, data.attendees, data.links, data.reminders), MeetingBriefResponse);
      if (!alive) return;
      if (res.ok) {
        briefs.set(briefKey, res.data);
        setBrief({ status: 'ready', data: res.data });
      } else setBrief({ status: 'error', message: res.message });
    })();
    return () => {
      alive = false;
    };
    // The brief depends on WHO is in the meeting (briefKey), not on every live-query refresh.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [briefKey]);

  if (data === undefined) return null;
  if (data === null) {
    return (
      <aside className="flex h-full w-[26rem] shrink-0 flex-col border-l bg-background p-4 text-sm text-muted-foreground">This meeting is no longer in your calendar.</aside>
    );
  }
  const { meeting, attendees, reminders, unknown } = data;
  const perPerson = brief.status === 'ready' ? new Map(brief.data.perPerson.map((p) => [p.personId, p])) : null;

  // Step 5.
  const logMeeting = async () => {
    for (const p of attendees) await logContact(p.id, 'meeting', meeting.title);
    setLogged(true);
    toast.success(`Logged "${meeting.title}" for ${attendees.length === 1 ? attendees[0]!.name : `${attendees.length} people`}`);
  };

  // Step 6.
  const addAttendee = async (email: string) => {
    const person = await addPerson({ name: nameFromEmail(email), email, ring: 3, primaryTag: 'Work' });
    await addMeetingAttendee(meeting.id, person.id);
    toast.success(`Added ${person.name} (edit their card to fix the name)`);
  };

  return (
    <aside className="flex h-full w-[26rem] shrink-0 flex-col border-l bg-background" aria-label={`Prep for ${meeting.title}`}>
      <div className="flex items-start justify-between gap-2 border-b p-4">
        <div className="min-w-0">
          <h2 className="truncate text-lg font-semibold">{meeting.title}</h2>
          <p className="text-sm text-muted-foreground">
            {meetingTimeLabel(meeting.start)}
            {isSampleMeeting(meeting) && ' · sample meeting'}
          </p>
        </div>
        <Button variant="ghost" size="icon" aria-label="Close" onClick={clearFocus}>
          <X />
        </Button>
      </div>

      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-4 text-sm">
        <section aria-live="polite" className="space-y-1">
          <h3 className={sectionHeading}>Brief</h3>
          {brief.status === 'loading' && <p className="text-muted-foreground">Preparing your brief…</p>}
          {brief.status === 'error' && <p className="text-muted-foreground">{brief.message}</p>}
          {brief.status === 'blocked' && (
            <p className="text-muted-foreground">
              AI briefs for real calendar meetings are off on the free tier, because they would send real people&apos;s notes to Google. Try a sample meeting,
              or use a paid key.
            </p>
          )}
          {brief.status === 'ready' && <p>{brief.data.summary}</p>}
        </section>

        {/* Step 4 */}
        {attendees.map((p) => {
          const b = perPerson?.get(p.id);
          const open = reminders.filter((r) => r.personId === p.id);
          return (
            <section key={p.id} className="space-y-1.5" aria-label={p.name}>
              <button className="font-medium underline-offset-2 hover:underline" onClick={() => selectPerson(p.id)}>
                {p.name}
              </button>
              {b?.howYouKnow && <p className="text-muted-foreground">{b.howYouKnow}</p>}
              {b && b.talkingPoints.length > 0 && (
                <ul className="list-disc space-y-0.5 pl-5">
                  {b.talkingPoints.map((t) => (
                    <li key={t}>{t}</li>
                  ))}
                </ul>
              )}
              {open.map((r) => (
                <p key={r.id} className="text-xs">
                  <span className="text-muted-foreground">Follow-up ({r.dueDate}):</span> {r.note || 'follow up'}
                </p>
              ))}
            </section>
          );
        })}

        {/* Step 6 */}
        {unknown.length > 0 && (
          <section className="space-y-1.5">
            <h3 className={sectionHeading}>Not in your network</h3>
            <ul className="space-y-1">
              {unknown.map((email) => (
                <li key={email} className="flex items-center gap-2">
                  <span className="min-w-0 flex-1 truncate">{email}</span>
                  <Button size="xs" variant="outline" aria-label={`Add ${email} to your network`} onClick={() => void addAttendee(email)}>
                    <UserPlus /> Add
                  </Button>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

      {attendees.length > 0 && (
        <div className="border-t p-4">
          <Button className="w-full" disabled={logged} onClick={() => void logMeeting()}>
            {logged ? 'Logged' : 'Log this meeting'}
          </Button>
          <p className="mt-1.5 text-xs text-muted-foreground">Counts as contact today for everyone above, so they stop drifting.</p>
        </div>
      )}
    </aside>
  );
}
