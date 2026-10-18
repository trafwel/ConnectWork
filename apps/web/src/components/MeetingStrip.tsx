/**
 * M11 — MeetingStrip: today's meetings above the map · done
 *
 * WHAT THIS ACHIEVES
 *   A glanceable row of today's and tomorrow's meetings with the faces you
 *   already know. Clicking one highlights those people on the map and opens a
 *   prep card. It makes the app useful every day, not just at import time.
 *
 * HOW IT FITS
 *   Below the TopBar in App.tsx. Reads db.meetings (useLiveQuery), filled by
 *   lib/googleCalendar.ts (real or sample) through replaceMeetings(). Click →
 *   openMeeting(id, attendees): highlights + rightPanel 'meeting' (App renders <MeetingPrepCard />).
 *
 * STEPS
 *   1. On mount and whenever the connection changes: connected → fetchMeetings(people),
 *      else loadSampleMeetings(people); replaceMeetings(rows). Also re-run when people's emails
 *      change (a new contact may match an attendee), but not on every edit, and when the
 *      meetings table is emptied (Reset demo data). Connected with no meetings stays empty:
 *      no loop, because the dependency doesn't change.
 *   2. Chips: time ("3:30 PM" / "Tomorrow 11:00 AM"), title, initials of matched people.
 *      "Meetings" label when not connected (was "Sample meetings" until Oct 18), with "Connect Google Calendar" if the app
 *      has a client id (otherwise nothing to click: connecting is a setup step).
 *   3. Chip click → openMeeting(meeting.id, meeting.attendeePersonIds).
 *   4. Connected with nothing today or tomorrow → one quiet line instead of chips.
 *
 * DONE WHEN
 *   - "Coffee with John" shows today; clicking it highlights John and opens the prep card.
 *
 * Guide: §18.3
 */
import { useEffect, useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { CalendarDays, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import type { Person } from '@connectwork/shared';
import { Button } from '@/components/ui/button';
import { replaceMeetings } from '@/db/actions';
import { db } from '@/db/db';
import { calendarConfigured, connectCalendar, disconnectCalendar, fetchMeetings, loadSampleMeetings } from '@/lib/googleCalendar';
import { meetingTimeLabel, upcoming } from '@/lib/meetings';
import { readableOn, tagColor } from '@/lib/colors';
import { initials } from '@/lib/people';
import { cn } from '@/lib/utils';
import { useStore } from '@/store/useStore';

export function MeetingStrip({ people }: { people: Person[] }) {
  const connected = useStore((s) => s.calendarConnected);
  const selectedMeetingId = useStore((s) => s.selectedMeetingId);
  const openMeeting = useStore((s) => s.openMeeting);
  const meetings = useLiveQuery(() => db.meetings.toArray(), []);
  const tags = useLiveQuery(() => db.tags.toArray(), []);
  const [refresh, setRefresh] = useState(0);
  const [busy, setBusy] = useState(false);

  // Step 1. Emails are what attendees match on, so they (not every edit) trigger a reload. So does
  // an emptied table: Settings → Reset demo data / Import backup replace every table, meetings too.
  const emailKey = useMemo(() => people.map((p) => p.email ?? '').join('|'), [people]);
  const emptied = meetings !== undefined && meetings.length === 0;
  useEffect(() => {
    let alive = true;
    void (async () => {
      const everyone = await db.people.toArray();
      try {
        const rows = connected ? await fetchMeetings(everyone) : await loadSampleMeetings(everyone);
        if (alive) await replaceMeetings(rows);
      } catch (e) {
        if (alive) toast.error(e instanceof Error ? e.message : 'Could not load meetings');
      }
    })();
    return () => {
      alive = false;
    };
  }, [connected, emailKey, refresh, emptied]);

  const byId = useMemo(() => new Map(people.map((p) => [p.id, p])), [people]);
  const shown = upcoming(meetings ?? []);

  const connect = async () => {
    setBusy(true);
    try {
      await connectCalendar();
      toast.success('Google Calendar connected');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not connect Google Calendar');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section aria-label="Upcoming meetings" className="flex min-h-11 shrink-0 items-center gap-2 overflow-x-auto border-b px-4 py-1.5 text-sm">
      <CalendarDays className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      <span className="shrink-0 text-xs text-muted-foreground">{connected ? 'Google Calendar' : 'Meetings'}</span>

      {/* Step 4 */}
      {connected && shown.length === 0 && <span className="text-xs text-muted-foreground">No meetings today or tomorrow.</span>}

      {/* Steps 2–3 */}
      <ul className="flex items-center gap-2">
        {shown.map((m) => {
          const known = m.attendeePersonIds.map((id) => byId.get(id)).filter((p): p is Person => Boolean(p));
          // Oct 18: color-coded by the group of the first person you know there, the same colors as
          // the map. Color is never the only signal: the group is also in the accessible name.
          const group = known[0]?.primaryTag;
          const accent = group ? tagColor(tags, group) : undefined;
          const label = `${m.title}, ${meetingTimeLabel(m.start)}${known.length ? `, with ${known.map((p) => p.name).join(', ')}` : ''}${group ? ` (${group})` : ''}`;
          return (
            <li key={m.id}>
              <button
                aria-label={label}
                aria-pressed={selectedMeetingId === m.id}
                onClick={() => openMeeting(m.id, m.attendeePersonIds)}
                className={cn(
                  'flex items-center gap-2 rounded-md border border-l-4 px-2 py-1 whitespace-nowrap hover:bg-muted',
                  selectedMeetingId === m.id && 'border-foreground bg-muted',
                )}
                style={accent ? { borderLeftColor: accent } : undefined}
              >
                <span className="text-xs text-muted-foreground tabular-nums">{meetingTimeLabel(m.start)}</span>
                <span className="max-w-48 truncate">{m.title}</span>
                {known.length > 0 && (
                  <span className="flex -space-x-1" aria-hidden="true">
                    {known.slice(0, 3).map((p) => (
                      <span
                        key={p.id}
                        className="grid size-5 place-items-center rounded-full border border-background text-[9px] font-semibold"
                        style={{ background: tagColor(tags, p.primaryTag), color: readableOn(tagColor(tags, p.primaryTag)) }}
                      >
                        {initials(p.name)}
                      </span>
                    ))}
                    {known.length > 3 && <span className="pl-1.5 text-xs text-muted-foreground">+{known.length - 3}</span>}
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>

      <span className="flex-1" />
      {connected ? (
        <>
          <Button size="xs" variant="ghost" aria-label="Refresh meetings" onClick={() => setRefresh((n) => n + 1)}>
            <RefreshCw />
          </Button>
          <Button size="xs" variant="ghost" onClick={disconnectCalendar}>
            Disconnect
          </Button>
        </>
      ) : (
        calendarConfigured() && (
          <Button size="xs" variant="outline" disabled={busy} onClick={() => void connect()}>
            Connect Google Calendar
          </Button>
        )
      )}
    </section>
  );
}
