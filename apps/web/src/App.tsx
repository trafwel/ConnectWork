/**
 * App shell · M9 state (grows in every milestone)
 *
 * WHAT THIS DOES NOW (M3)
 *   Seeds the demo into IndexedDB on first load, then shows the ring map: top bar
 *   (+ Add), the map (pan, zoom, click to select and center), the person card on
 *   the right, Quick add (N), CSV import, Settings and toasts. Escape closes the card.
 *   M5: "Ask Connectwork" in the top bar, the answer card over the map, the free-tier banner.
 *   M6: "Find hidden links", and the review sheet on the right for AI suggestions.
 *   M7: filter tabs on the left, reminder flags on the map, the Due panel on the right.
 *   M8: "Review my week" → the weekly plan panel; "Draft a message" on each person card.
 *   M9: "Snap" → photo/PDF → people in the review sheet (lazy-loaded, shares the CSV chunk).
 *   Step S: Appearance (Neutral/Atlas × System/Light/Dark) via lib/appearance.ts.
 *   (The M0 health line is gone from the screen; /api/health still exists.)
 *
 * WHAT IT BECOMES
 *   The single screen of Connectwork: a top bar (agent question box, Find hidden
 *   links, Import, Add), the demo banner, the ring map in the middle, and a right
 *   panel (person card, review sheet, weekly review, meeting prep).
 *
 * STEPS — add these as you build each milestone
 *   M1  ✓ done.
 *       1. On mount, call ensureSeeded() (db/seed.ts) and keep a `ready` flag.
 *       2. Replace this page with the layout: <TopBar> on top, <main> below,
 *          <QuickAdd />
      {snapLoaded && (
        <Suspense fallback={null}>
          <SnapDialog />
        </Suspense>
      )}
      {importLoaded && (
        <Suspense fallback={null}>
          <ImportDialog />
        </Suspense>
      )}
      <SettingsDialog appearance={appearance} onAppearance={setAppearance} /> and <Toaster position="bottom-center" /> at the end.
 *       3. Root: <div className="flex h-screen flex-col bg-background text-foreground">.
 *   M2  ✓ done.
 *       4. Read data with useLiveQuery (dexie-react-hooks):
 *            const people = useLiveQuery(() => db.people.toArray()); (same for links, tags, reminders)
 *          useLiveQuery re-renders automatically whenever the table changes.
 *       5. filterContext = useMemo(() => ({ dueIds: new Set(dueReminders(reminders ?? []).map(r => r.personId)),
 *                                           driftingIds: new Set() }), [reminders])
 *       6. <main className={`relative min-w-0 flex-1 ${view === 'list' ? 'flex flex-col' : ''}`}> renders <RingMap people links tags filterContext />
 *          when loaded, an empty state ("Import your LinkedIn connections or press N") when
 *          there are no people, and "Loading…" before that.
 *       7. Right panel: {selectedId && <PersonCard personId={selectedId} />} next to <main>.
 *   M3  ✓ done.
 *       8. const openQuickAdd = useCallback(() => setDialog('quickAdd', true), [setDialog]);
 *          useHotkey('n', openQuickAdd); a "+ Add N" button in the top bar; render <QuickAdd />.
 *   M4  ✓ done.
 *       9. An "Import" button (setDialog('import', true)) and <ImportDialog />.
 *   M5  ✓ done.
 *      10. <AgentBar /> centered in the top bar, <DemoBanner /> under it,
 *          <AgentAnswer /> as the first child of <main>.
 *   M6  ✓ done.
 *      11. "Find hidden links" button; the right panel shows <ReviewSheet /> when
 *          rightPanel === 'review', otherwise the person card.
 *
 * Shared file: tell your teammate before editing it. Guide: docs/IMPLEMENTATION_GUIDE.md §1.4, §4.4
 */
import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { CalendarCheck, Camera, Plus, Upload, Waypoints } from 'lucide-react';
import { AgentAnswer } from '@/components/AgentAnswer';
import { AgentBar } from '@/components/AgentBar';
import { DemoBanner } from '@/components/DemoBanner';
import { FilterTabs } from '@/components/FilterTabs';
import { ListView } from '@/components/ListView';
import { MeetingPrepCard } from '@/components/MeetingPrepCard';
import { MeetingStrip } from '@/components/MeetingStrip';
import { PersonCard } from '@/components/PersonCard';
import { RemindersPanel } from '@/components/RemindersPanel';
import { ReviewSheet } from '@/components/ReviewSheet';
import { QuickAdd } from '@/components/QuickAdd';
import { Segmented } from '@/components/Segmented';
import { SettingsDialog } from '@/components/SettingsDialog';
import { TopBar } from '@/components/TopBar';
import { WeeklyReview } from '@/components/WeeklyReview';
import { Button } from '@/components/ui/button';
import { Toaster } from '@/components/ui/sonner';
import { db } from '@/db/db';
import { ensureSeeded } from '@/db/seed';
import { RingMap } from '@/graph/RingMap';
import { findHiddenLinks } from '@/lib/aiFlows';
import { useAppearance } from '@/lib/appearance';
import type { FilterContext } from '@/lib/filters';
import { localDate, today } from '@/lib/dates';
import { driftLevel } from '@/lib/drift';
import { dueReminders, isOverdue } from '@/lib/people';
import { useDriftThresholds } from '@/lib/useDriftThresholds';
import { useHotkey } from '@/lib/useHotkey';
import { useStore } from '@/store/useStore';

// Loaded the first time Import is opened: keeps Papa Parse and the dialog out of the main bundle (M4-E5).
// M9: also lazy — it imports lib/csv.ts (Papa Parse), which must stay out of the main bundle.
const SnapDialog = lazy(() => import('@/components/SnapDialog').then((m) => ({ default: m.SnapDialog })));
const ImportDialog = lazy(() => import('@/components/ImportDialog').then((m) => ({ default: m.ImportDialog })));

/** Fix step 2: Escape leaves "Move people" first; the next Escape clears the selection. Module-level, so it's stable. */
function onEscape() {
  const s = useStore.getState();
  if (s.editRings) s.setEditRings(false);
  else s.clearFocus();
}

export default function App() {
  const [ready, setReady] = useState(false);
  const [seedError, setSeedError] = useState(false);
  const selectedId = useStore((s) => s.selectedPersonId);
  const rightPanel = useStore((s) => s.rightPanel);
  const selectedMeetingId = useStore((s) => s.selectedMeetingId);
  const filter = useStore((s) => s.filter);
  const view = useStore((s) => s.view);
  const setView = useStore((s) => s.setView);
  const weeklyOpen = useStore((s) => s.weeklyOpen);
  const setWeeklyOpen = useStore((s) => s.setWeeklyOpen);
  // Step S: style + mode, applied to <html>; Settings changes it, toasts follow it.
  const [appearance, setAppearance] = useAppearance();
  const setDialog = useStore((s) => s.setDialog);
  const importOpen = useStore((s) => s.importOpen);
  // Once loaded, the dialog stays mounted so its close animation can play.
  const [importLoaded, setImportLoaded] = useState(false);
  if (importOpen && !importLoaded) setImportLoaded(true);
  const snapOpen = useStore((s) => s.snapOpen);
  const [snapLoaded, setSnapLoaded] = useState(false);
  if (snapOpen && !snapLoaded) setSnapLoaded(true);

  // Step 8. Stable handlers, so useHotkey doesn't re-add its listener every render.
  const openQuickAdd = useCallback(() => setDialog('quickAdd', true), [setDialog]);
  useHotkey('n', openQuickAdd);
  useHotkey('Escape', onEscape); // ignored while typing or with a dialog open

  useEffect(() => {
    ensureSeeded()
      .then(() => setReady(true))
      .catch(() => setSeedError(true)); // e.g. private browsing with IndexedDB disabled
  }, []);

  // Step 4. Each re-runs automatically when its table changes.
  const people = useLiveQuery(() => db.people.toArray(), []);
  const links = useLiveQuery(() => db.links.toArray(), []);
  const tags = useLiveQuery(() => db.tags.toArray(), []);
  const reminders = useLiveQuery(() => db.reminders.toArray(), []);

  // Step 5. Computed once per data change, not once per person per render.
  // M7: overdue ids for the map flags. M10: each person's drift, computed ONCE here with the
  // user's limits, then shared by the Drifting tab, the map (offset, fading) and the list.
  // `day` is a dependency so drift is recomputed when the date changes (an app left open overnight).
  const thresholds = useDriftThresholds();
  const day = today();
  const filterContext = useMemo<FilterContext>(() => {
    const due = dueReminders(reminders ?? []);
    const drift = new Map<string, number>();
    const now = localDate(day);
    for (const p of people ?? []) {
      const level = driftLevel(p, now, thresholds);
      if (level > 0) drift.set(p.id, level);
    }
    return {
      dueIds: new Set(due.map((r) => r.personId)),
      overdueIds: new Set(due.filter((r) => isOverdue(r)).map((r) => r.personId)),
      driftingIds: new Set(drift.keys()),
      drift,
    };
  }, [reminders, people, thresholds, day]);

  // M7: tab counts (people per primary tag, plus Due and Drifting).
  const counts = useMemo(() => {
    const out: Record<string, number> = { all: people?.length ?? 0, due: filterContext.dueIds.size, drifting: filterContext.driftingIds.size };
    for (const p of people ?? []) out[p.primaryTag] = (out[p.primaryTag] ?? 0) + 1;
    return out;
  }, [people, filterContext]);

  const loaded = ready && people && links && tags;

  return (
    <div className="flex h-screen flex-col bg-background text-foreground">
      <TopBar>
        {/* M10 step 1: the list is the map's accessible twin, so the switch sits up front. */}
        <Segmented
          label="View"
          value={view}
          onChange={setView}
          options={[
            { value: 'map', label: 'Map' },
            { value: 'groups', label: 'Groups' },
            { value: 'list', label: 'List' },
          ]}
        />
        <div className="mx-auto w-full max-w-xl">
          <AgentBar />
        </div>
        <Button size="sm" onClick={() => setWeeklyOpen(true)}>
          <CalendarCheck /> Review my week
        </Button>
        <Button size="sm" variant="outline" onClick={() => void findHiddenLinks()}>
          <Waypoints /> Find hidden links
        </Button>
        <Button size="sm" variant="outline" onClick={() => setDialog('snap', true)}>
          <Camera /> Snap
        </Button>
        <Button size="sm" variant="outline" onClick={() => setDialog('import', true)}>
          <Upload /> Import
        </Button>
        <Button size="sm" variant="outline" onClick={openQuickAdd} aria-keyshortcuts="N">
          <Plus /> Add <kbd className="ml-1 text-xs opacity-70">N</kbd>
        </Button>
      </TopBar>
      <DemoBanner />
      {/* M11: today's and tomorrow's meetings (Google Calendar, or samples). */}
      {loaded && people.length > 0 && <MeetingStrip people={people} />}
      <div className="flex min-h-0 flex-1">
        {/* M7 step 4 */}
        {loaded && people.length > 0 && <FilterTabs counts={counts} />}
        {/* Step 6 */}
        <main className="relative min-w-0 flex-1">
          {/* M10: same element in both views (screen readers keep announcing); the list puts it in the flow. */}
          <AgentAnswer inline={view === 'list'} />
          {seedError ? (
            <Centered title="This browser blocked local storage" detail="Connectwork keeps your data in this browser. Try a normal (not private) window." />
          ) : !loaded ? (
            <Centered title="Loading…" />
          ) : people.length === 0 ? (
            <Centered
              title="No one on your map yet"
              detail="Import your LinkedIn connections, press N to add someone, or use Settings → Reset demo data for the sample network."
            />
          ) : view === 'list' ? (
            <ListView people={people} tags={tags} reminders={reminders ?? []} filterContext={filterContext} />
          ) : (
            <RingMap people={people} links={links} tags={tags} filterContext={filterContext} grouped={view === 'groups'} />
          )}
        </main>
        {/* Steps 7 and 11: the review sheet, or the selected person's card */}
        {/* M7 step 5: the Due tab opens the reminders panel when nothing else is open. */}
        {rightPanel === 'review' ? (
          <ReviewSheet />
        ) : selectedId ? (
          <PersonCard personId={selectedId} />
        ) : rightPanel === 'meeting' && selectedMeetingId ? (
          // M11: keyed, so switching meetings starts a fresh brief.
          <MeetingPrepCard key={selectedMeetingId} meetingId={selectedMeetingId} />
        ) : weeklyOpen ? (
          // M8: closing a person's card returns here.
          <WeeklyReview />
        ) : filter === 'due' ? (
          <RemindersPanel />
        ) : null}
      </div>
      <QuickAdd />
      {snapLoaded && (
        <Suspense fallback={null}>
          <SnapDialog />
        </Suspense>
      )}
      {importLoaded && (
        <Suspense fallback={null}>
          <ImportDialog />
        </Suspense>
      )}
      <SettingsDialog appearance={appearance} onAppearance={setAppearance} />
      <Toaster position="bottom-center" theme={appearance.dark ? 'dark' : 'light'} />
    </div>
  );
}

function Centered({ title, detail }: { title: string; detail?: string }) {
  return (
    <div className="flex h-full items-center justify-center p-6 text-center" aria-live="polite">
      <div>
        <p className="text-lg font-semibold">{title}</p>
        {detail && <p className="mt-1 text-sm text-muted-foreground">{detail}</p>}
      </div>
    </div>
  );
}
