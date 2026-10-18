/**
 * M8 — WeeklyReview panel: the agent plans, you approve, it does the work · done
 *
 * WHAT THIS ACHIEVES
 *   The demo's finale. One "Review my week" button → a short plan of 5–6
 *   actions, each with a reason and (where useful) a ready-to-send draft.
 *   Approving an action actually does it: sets the reminder, accepts the link,
 *   copies the message. This is what makes Connectwork an agent for the Cook
 *   Smarter track rather than a chatbot.
 *
 * HOW IT FITS
 *   TopBar "Review my week" → useStore rightPanel = 'weekly' → this panel →
 *   weeklyCandidates() + buildSummary() → aiPost('/weekly-review') →
 *   action cards → Approve → db/actions.ts (addReminder, acceptLink) + clipboard.
 *
 * STEPS
 *   1. TopBar: a "Review my week" button → store.setWeeklyOpen(true). The plan is cached in
 *      store.weekly, so reopening the panel (e.g. after opening a person's card) does NOT
 *      call Gemini again; "Refresh" does.
 *   2. On mount: load people/links/reminders from Dexie, build candidates and
 *      summary, call aiPost('/weekly-review', { summary, candidates, today }, WeeklyReviewResponse).
 *      Show "Looking at your week…" while waiting; show res.message on error
 *      with a Retry button. Zero candidates → "You're all caught up" without calling the AI.
 *   3. Render the headline, then one card per action: title, why, and if
 *      draftMessage exists an editable <textarea> plus Copy.
 *      Hover/focus a card → setHighlights(action.personIds).
 *   4. Approve (per card):
 *        - follow_up → rescheduleReminder(the candidate's reminderId, reminderDate) — M8 review:
 *          creating a NEW reminder would duplicate the one that made it a candidate
 *        - other kinds with a reminderDate → addReminder(personIds[0], reminderDate, title)
 *        - kind 'accept_link' && linkId → acceptLink(linkId)
 *        - draft → navigator.clipboard.writeText(text) + toast "Draft copied"
 *        - offer "Add to calendar" (lib/ics.ts; Google Calendar after M11)
 *      Mark the card done (checkmark, muted). Approve all = every card.
 *   5. Approving must NOT change lastContact — only real contact does (Log contact).
 *
 * DONE WHEN
 *   - On the seed: ≤ 6 actions including John Park; approving creates the
 *     reminders, accepts suggested links and copies editable drafts.
 *
 * Guide: §15.3
 */

import { useEffect, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { CalendarPlus, Check, Copy, RefreshCw, X } from 'lucide-react';
import { toast } from 'sonner';
import { WeeklyReviewResponse, type Candidate } from '@connectwork/shared';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { acceptLink, addReminder, rescheduleReminder } from '@/db/actions';
import { db } from '@/db/db';
import { addToCalendar } from '@/lib/addToCalendar';
import { aiPost } from '@/lib/api';
import { formatDate, today } from '@/lib/dates';
import { buildSummary } from '@/lib/graphSummary';
import { cn, sectionHeading } from '@/lib/utils';
import { weeklyCandidates } from '@/lib/weeklyCandidates';
import { readDriftThresholds } from '@/lib/useDriftThresholds';
import { useStore } from '@/store/useStore';

type Action = WeeklyReviewResponse['actions'][number];

// Step 2. Module-level so a run survives the panel unmounting (its result lands in the store).
async function runWeekly(): Promise<void> {
  const { setWeekly } = useStore.getState();
  setWeekly({ status: 'loading', done: [], message: undefined });
  const [people, links, reminders, thresholds] = await Promise.all([db.people.toArray(), db.links.toArray(), db.reminders.toArray(), readDriftThresholds()]);
  const candidates = weeklyCandidates(people, links, reminders, new Date(), thresholds);
  if (!candidates.length) {
    setWeekly({ status: 'ready', candidates, plan: { headline: "You're all caught up", actions: [] } });
    return;
  }
  const res = await aiPost('/weekly-review', { summary: buildSummary(people, links, reminders), candidates, today: today() }, WeeklyReviewResponse);
  if (!res.ok) setWeekly({ status: 'error', message: res.message });
  else setWeekly({ status: 'ready', candidates, plan: res.data });
}

export function WeeklyReview() {
  const weekly = useStore((s) => s.weekly);
  const setWeekly = useStore((s) => s.setWeekly);
  const setWeeklyOpen = useStore((s) => s.setWeeklyOpen);
  const setHighlights = useStore((s) => s.setHighlights);
  const selectPerson = useStore((s) => s.selectPerson);
  const names = useLiveQuery(async () => new Map((await db.people.toArray()).map((p) => [p.id, p.name])), []);
  const [drafts, setDrafts] = useState<Record<number, string>>({});
  const [busy, setBusy] = useState(false);
  const before = useRef<Set<string> | null>(null);

  useEffect(() => {
    if (useStore.getState().weekly.status === 'idle') void runWeekly();
  }, []);

  // Step 3. Hover/focus shows who a card is about; leaving restores what was there (M6 lesson).
  const show = (ids: string[]) => {
    before.current ??= new Set(useStore.getState().highlightIds);
    setHighlights(ids);
  };
  const restore = () => {
    setHighlights(before.current ?? []);
    before.current = null;
  };

  const candidateFor = (a: Action): Candidate | undefined =>
    weekly.candidates?.find((c) => c.kind === 'follow_up' && a.kind === 'follow_up' && c.personId === a.personIds[0]);

  // Step 4. Approving does the work through actions.ts. Step 5: it never touches lastContact.
  const approve = async (a: Action, i: number, opts: { copy: boolean }) => {
    if (a.kind === 'follow_up') {
      const c = candidateFor(a);
      if (c?.kind === 'follow_up' && a.reminderDate) await rescheduleReminder(c.reminderId, a.reminderDate);
    } else if (a.reminderDate) {
      await addReminder(a.personIds[0]!, a.reminderDate, a.title);
    }
    if (a.kind === 'accept_link' && a.linkId) await acceptLink(a.linkId);
    const text = drafts[i] ?? a.draftMessage;
    const copied = opts.copy && text ? await copy(text) : false;
    setWeekly({ done: [...new Set([...useStore.getState().weekly.done, i])] });
    return { copied, hadDraft: Boolean(text) };
  };

  const approveAll = async () => {
    if (!weekly.plan) return;
    setBusy(true);
    try {
      for (const [i, a] of weekly.plan.actions.entries()) if (!weekly.done.includes(i)) await approve(a, i, { copy: false });
      toast.success('Done. Copy any drafts you want to send from their cards.');
    } catch {
      toast.error('Some actions could not be applied');
    } finally {
      setBusy(false);
    }
  };

  const reminderFor = async (a: Action) => {
    const personId = a.personIds[0]!;
    const [person, reminders] = await Promise.all([db.people.get(personId), db.reminders.where('personId').equals(personId).toArray()]);
    const r = reminders.filter((x) => !x.done).sort((x, y) => x.dueDate.localeCompare(y.dueDate))[0];
    if (person && r) await addToCalendar([{ reminder: r, person }]);
    else toast('No open reminder to add for this person');
  };

  return (
    <aside className="flex h-full w-[26rem] shrink-0 flex-col border-l bg-background" aria-label="Weekly review">
      <div className="flex items-start justify-between gap-2 border-b p-4">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold">Your week</h2>
          <p className="text-sm text-muted-foreground" aria-live="polite">
            {weekly.status === 'loading' ? 'Looking at your week…' : weekly.status === 'ready' ? weekly.plan?.headline : weekly.status === 'error' ? 'Could not plan your week' : ''}
          </p>
        </div>
        <div className="flex shrink-0 gap-1">
          <Button variant="ghost" size="icon" aria-label="Plan again" disabled={weekly.status === 'loading'} onClick={() => void runWeekly()}>
            <RefreshCw />
          </Button>
          <Button variant="ghost" size="icon" aria-label="Close weekly review" onClick={() => setWeeklyOpen(false)}>
            <X />
          </Button>
        </div>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto p-3">
        {weekly.status === 'error' && (
          <div className="space-y-2 rounded-md border border-destructive p-3 text-sm text-destructive">
            <p>{weekly.message}</p>
            <Button size="sm" variant="outline" onClick={() => void runWeekly()}>
              Try again
            </Button>
          </div>
        )}
        {weekly.status === 'ready' && weekly.plan?.actions.length === 0 && (
          <p className="p-2 text-sm text-muted-foreground">Nothing needs you this week. Nice.</p>
        )}
        {weekly.status === 'ready' &&
          weekly.plan?.actions.map((a, i) => {
            const done = weekly.done.includes(i);
            const text = drafts[i] ?? a.draftMessage;
            return (
              <article
                key={i}
                className={cn('space-y-2 rounded-md border p-3 text-sm', done && 'opacity-60')}
                onMouseEnter={() => show(a.personIds)}
                onMouseLeave={restore}
                onFocus={() => show(a.personIds)}
                onBlur={restore}
              >
                <div className="flex items-start gap-2">
                  {done && <Check className="mt-0.5 size-4 shrink-0 text-primary" aria-label="Done" />}
                  <div className="min-w-0 flex-1">
                    <h3 className="font-medium">{a.title}</h3>
                    <p className="text-muted-foreground">{a.why}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5 text-xs">
                  {a.personIds.map((id) => (
                    <button key={id} className="underline-offset-2 hover:underline" onClick={() => selectPerson(id)}>
                      {names?.get(id) ?? 'Someone'}
                    </button>
                  ))}
                  {a.reminderDate && <span className="text-muted-foreground">· reminder {formatDate(a.reminderDate)}</span>}
                </div>
                {text !== undefined && (
                  <div className="space-y-1">
                    <label className={sectionHeading} htmlFor={`weekly-draft-${i}`}>
                      Draft (edit before sending)
                    </label>
                    <Textarea id={`weekly-draft-${i}`} rows={4} value={text} maxLength={600} onChange={(e) => setDrafts((d) => ({ ...d, [i]: e.target.value }))} />
                  </div>
                )}
                <div className="flex flex-wrap gap-1.5">
                  <Button
                    size="xs"
                    disabled={done || busy}
                    onClick={() =>
                      void approve(a, i, { copy: true }).then(({ copied, hadDraft }) =>
                        hadDraft && !copied ? toast('Done. Copy the draft yourself (the browser blocked copying).') : toast.success(copied ? 'Done · draft copied' : 'Done'),
                      )
                    }
                  >
                    {done ? 'Done' : 'Approve'}
                  </Button>
                  {text && (
                    <Button
                      size="xs"
                      variant="outline"
                      onClick={() => void copy(text).then((ok) => (ok ? toast.success('Draft copied') : toast.error('Could not copy. Select the text and copy it yourself.')))}
                    >
                      <Copy /> Copy
                    </Button>
                  )}
                  {done && (a.reminderDate || a.kind === 'follow_up') && (
                    <Button size="xs" variant="outline" onClick={() => void reminderFor(a)}>
                      <CalendarPlus /> Add to calendar
                    </Button>
                  )}
                </div>
              </article>
            );
          })}
      </div>

      {weekly.status === 'ready' && !!weekly.plan?.actions.length && (
        <div className="flex justify-end gap-2 border-t p-3">
          <Button disabled={busy || weekly.done.length === weekly.plan.actions.length} onClick={() => void approveAll()}>
            Approve all
          </Button>
        </div>
      )}
    </aside>
  );
}

/** Copies to the clipboard; false when the browser refused (the caller shows one message). */
async function copy(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
