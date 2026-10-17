/**
 * App shell · M1 state (grows in every milestone)
 *
 * WHAT THIS DOES NOW (M1)
 *   Seeds the demo into IndexedDB on first load and shows the layout: top bar,
 *   a live people count in the middle, Settings (backup/reset/delete) and toasts.
 *   The M0 health check moved into a small status line under the count.
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
 *          <SettingsDialog /> and <Toaster position="bottom-center" /> at the end.
 *       3. Root: <div className="flex h-screen flex-col bg-background text-foreground">.
 *   M2  4. Read data with useLiveQuery (dexie-react-hooks):
 *            const people = useLiveQuery(() => db.people.toArray()); (same for links, tags, reminders)
 *          useLiveQuery re-renders automatically whenever the table changes.
 *       5. filterContext = useMemo(() => ({ dueIds: new Set(dueReminders(reminders ?? []).map(r => r.personId)),
 *                                           driftingIds: new Set() }), [reminders])
 *       6. <main className="relative min-w-0 flex-1"> renders <RingMap people links tags filterContext />
 *          when loaded, an empty state ("Import your LinkedIn connections or press N") when
 *          there are no people, and "Loading…" before that.
 *       7. Right panel: {selectedId && <PersonCard personId={selectedId} />} next to <main>.
 *   M3  8. const openQuickAdd = useCallback(() => setDialog('quickAdd', true), [setDialog]);
 *          useHotkey('n', openQuickAdd); a "+ Add N" button in the top bar; render <QuickAdd />.
 *   M4  9. An "Import" button (setDialog('import', true)) and <ImportDialog />.
 *   M5 10. <AgentBar /> centered in the top bar, <DemoBanner /> under it,
 *          <AgentAnswer /> as the first child of <main>.
 *   M6 11. "Find hidden links" button; the right panel shows <ReviewSheet /> when
 *          rightPanel === 'review', otherwise the person card.
 *
 * Shared file: tell your teammate before editing it. Guide: docs/IMPLEMENTATION_GUIDE.md §1.4, §4.4
 */
import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { SettingsDialog } from '@/components/SettingsDialog';
import { TopBar } from '@/components/TopBar';
import { Toaster } from '@/components/ui/sonner';
import { db } from '@/db/db';
import { ensureSeeded } from '@/db/seed';

type Health = { ok: boolean; model: string; tier: string; cache: string };

export default function App() {
  const [ready, setReady] = useState(false);
  const [seedError, setSeedError] = useState(false);
  const [health, setHealth] = useState<Health | null>(null);
  const [serverDown, setServerDown] = useState(false);

  useEffect(() => {
    ensureSeeded()
      .then(() => setReady(true))
      .catch(() => setSeedError(true)); // e.g. private browsing with IndexedDB disabled
    fetch('/api/health')
      .then((r) => r.json() as Promise<Health>)
      .then(setHealth)
      .catch(() => setServerDown(true));
  }, []);

  // Re-runs automatically whenever the people table changes (reset, delete, import).
  // Shown only once seeding finished, so the first visit never flashes "0 people".
  const count = useLiveQuery(() => db.people.count(), []);
  const peopleCount = ready ? count : undefined;

  return (
    <div className="flex h-screen flex-col bg-background text-foreground">
      <TopBar />
      <main className="flex min-w-0 flex-1 items-center justify-center">
        <div className="text-center" aria-live="polite">
          <p className="text-2xl font-semibold">
            {seedError
              ? 'This browser blocked local storage'
              : peopleCount === undefined
                ? 'Loading…'
                : `${peopleCount} ${peopleCount === 1 ? 'person' : 'people'} in your network`}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            {serverDown ? 'Server unreachable' : health ? `Server ok · ${health.model} · ${health.tier} tier` : 'Checking server…'}
          </p>
        </div>
      </main>
      <SettingsDialog />
      <Toaster position="bottom-center" />
    </div>
  );
}
