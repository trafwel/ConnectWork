/**
 * M0–M5 — App shell: layout and wiring · done (grows with each milestone)
 *
 * WHAT THIS ACHIEVES
 *   The single screen of Connectwork: top bar (agent question box, Import, Add),
 *   the demo banner, the ring map in the middle, and the person card on the right.
 *   It loads data once and hands it to the map.
 *
 * HOW IT FITS
 *   Reads the database with useLiveQuery (re-renders automatically when Dexie
 *   changes) and UI state from the Zustand store. Every later milestone adds a
 *   piece here: FilterTabs (M7), ReviewSheet / WeeklyReview / MeetingPrepCard in
 *   the right panel (M6, M8, M11), MeetingStrip (M11), ListView (M10).
 *
 * HOW IT WAS BUILT
 *   1. On mount, ensureSeeded() (M1) fills the demo network on first run.
 *   2. Live queries for people, links, tags and reminders.
 *   3. filterContext: which people are due (M2) and drifting (filled in M10).
 *   4. The `N` hotkey opens Quick add (M3); Import opens the CSV dialog (M4).
 *   5. AgentBar + AgentAnswer + DemoBanner (M5).
 *
 * DONE WHEN
 *   - First load shows the 40-person map; every dialog opens from the top bar.
 *
 * Shared file: tell your teammate before editing it. Guide: §1.4
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Toaster } from '@/components/ui/sonner';
import { TopBar } from '@/components/TopBar';
import { SettingsDialog } from '@/components/SettingsDialog';
import { PersonCard } from '@/components/PersonCard';
import { QuickAdd } from '@/components/QuickAdd';
import { ImportDialog } from '@/components/ImportDialog';
import { AgentBar } from '@/components/AgentBar';
import { AgentAnswer } from '@/components/AgentAnswer';
import { DemoBanner } from '@/components/DemoBanner';
import { Button } from '@/components/ui/button';
import { Plus, Upload } from 'lucide-react';
import { useHotkey } from '@/lib/useHotkey';
import { RingMap } from '@/graph/RingMap';
import { db } from '@/db/db';
import { ensureSeeded } from '@/db/seed';
import { dueReminders } from '@/lib/people';
import { useStore } from '@/store/useStore';

export default function App() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    ensureSeeded().then(() => setReady(true));
  }, []);

  const people = useLiveQuery(() => db.people.toArray());
  const links = useLiveQuery(() => db.links.toArray());
  const tags = useLiveQuery(() => db.tags.toArray());
  const reminders = useLiveQuery(() => db.reminders.toArray());
  const selectedId = useStore((s) => s.selectedPersonId);
  const setDialog = useStore((s) => s.setDialog);
  const openQuickAdd = useCallback(() => setDialog('quickAdd', true), [setDialog]);
  useHotkey('n', openQuickAdd);

  const filterContext = useMemo(
    () => ({ dueIds: new Set(dueReminders(reminders ?? []).map((r) => r.personId)), driftingIds: new Set<string>() }),
    [reminders],
  );

  const loaded = ready && people && links && tags;

  return (
    <div className="flex h-screen flex-col bg-muted/30 text-foreground">
      <TopBar>
        <div className="flex flex-1 justify-center">
          <AgentBar />
        </div>
        <Button variant="outline" size="sm" onClick={() => setDialog('import', true)}>
          <Upload /> Import
        </Button>
        <Button variant="outline" size="sm" onClick={openQuickAdd}>
          <Plus /> Add <kbd className="ml-1 rounded border px-1 text-[10px] text-muted-foreground">N</kbd>
        </Button>
      </TopBar>
      <DemoBanner />
      <div className="flex min-h-0 flex-1">
        <main className="relative min-w-0 flex-1">
          <AgentAnswer />
          {loaded ? (
            people.length ? (
              <RingMap people={people} links={links} tags={tags} filterContext={filterContext} />
            ) : (
              <EmptyState />
            )
          ) : (
            <p className="p-6 text-muted-foreground">Loading…</p>
          )}
        </main>
        {selectedId && <PersonCard personId={selectedId} />}
      </div>
      <SettingsDialog />
      <QuickAdd />
      <ImportDialog />
      <Toaster position="bottom-center" />
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex h-full items-center justify-center p-6 text-center">
      <div>
        <h2 className="text-lg font-semibold">Your map is empty</h2>
        <p className="mt-1 text-sm text-muted-foreground">Import your LinkedIn connections or press N to add someone.</p>
      </div>
    </div>
  );
}
