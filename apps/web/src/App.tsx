/**
 * App shell · M4 state (grows in every milestone)
 *
 * WHAT THIS DOES NOW (M3)
 *   Seeds the demo into IndexedDB on first load, then shows the ring map: top bar
 *   (+ Add), the map (pan, zoom, click to select and center), the person card on
 *   the right, Quick add (N), CSV import, Settings and toasts. Escape closes the card.
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
      {importLoaded && (
        <Suspense fallback={null}>
          <ImportDialog />
        </Suspense>
      )}
      <SettingsDialog /> and <Toaster position="bottom-center" /> at the end.
 *       3. Root: <div className="flex h-screen flex-col bg-background text-foreground">.
 *   M2  ✓ done.
 *       4. Read data with useLiveQuery (dexie-react-hooks):
 *            const people = useLiveQuery(() => db.people.toArray()); (same for links, tags, reminders)
 *          useLiveQuery re-renders automatically whenever the table changes.
 *       5. filterContext = useMemo(() => ({ dueIds: new Set(dueReminders(reminders ?? []).map(r => r.personId)),
 *                                           driftingIds: new Set() }), [reminders])
 *       6. <main className="relative min-w-0 flex-1"> renders <RingMap people links tags filterContext />
 *          when loaded, an empty state ("Import your LinkedIn connections or press N") when
 *          there are no people, and "Loading…" before that.
 *       7. Right panel: {selectedId && <PersonCard personId={selectedId} />} next to <main>.
 *   M3  ✓ done.
 *       8. const openQuickAdd = useCallback(() => setDialog('quickAdd', true), [setDialog]);
 *          useHotkey('n', openQuickAdd); a "+ Add N" button in the top bar; render <QuickAdd />.
 *   M4  ✓ done.
 *       9. An "Import" button (setDialog('import', true)) and <ImportDialog />.
 *   M5 10. <AgentBar /> centered in the top bar, <DemoBanner /> under it,
 *          <AgentAnswer /> as the first child of <main>.
 *   M6 11. "Find hidden links" button; the right panel shows <ReviewSheet /> when
 *          rightPanel === 'review', otherwise the person card.
 *
 * Shared file: tell your teammate before editing it. Guide: docs/IMPLEMENTATION_GUIDE.md §1.4, §4.4
 */
import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Plus, Upload } from 'lucide-react';
import { PersonCard } from '@/components/PersonCard';
import { QuickAdd } from '@/components/QuickAdd';
import { SettingsDialog } from '@/components/SettingsDialog';
import { TopBar } from '@/components/TopBar';
import { Button } from '@/components/ui/button';
import { Toaster } from '@/components/ui/sonner';
import { db } from '@/db/db';
import { ensureSeeded } from '@/db/seed';
import { RingMap } from '@/graph/RingMap';
import type { FilterContext } from '@/lib/filters';
import { dueReminders } from '@/lib/people';
import { useHotkey } from '@/lib/useHotkey';
import { useStore } from '@/store/useStore';

// Loaded the first time Import is opened: keeps Papa Parse and the dialog out of the main bundle (M4-E5).
const ImportDialog = lazy(() => import('@/components/ImportDialog').then((m) => ({ default: m.ImportDialog })));

export default function App() {
  const [ready, setReady] = useState(false);
  const [seedError, setSeedError] = useState(false);
  const selectedId = useStore((s) => s.selectedPersonId);
  const setDialog = useStore((s) => s.setDialog);
  const clearFocus = useStore((s) => s.clearFocus);
  const importOpen = useStore((s) => s.importOpen);
  // Once loaded, the dialog stays mounted so its close animation can play.
  const [importLoaded, setImportLoaded] = useState(false);
  if (importOpen && !importLoaded) setImportLoaded(true);

  // Step 8. Stable handlers, so useHotkey doesn't re-add its listener every render.
  const openQuickAdd = useCallback(() => setDialog('quickAdd', true), [setDialog]);
  useHotkey('n', openQuickAdd);
  useHotkey('Escape', clearFocus); // ignored while typing or with a dialog open

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

  // Step 5. Computed once per reminders change, not once per person per render.
  const filterContext = useMemo<FilterContext>(
    () => ({ dueIds: new Set(dueReminders(reminders ?? []).map((r) => r.personId)), driftingIds: new Set() }),
    [reminders],
  );

  const loaded = ready && people && links && tags;

  return (
    <div className="flex h-screen flex-col bg-background text-foreground">
      <TopBar>
        <span className="flex-1" />
        <Button size="sm" variant="outline" onClick={() => setDialog('import', true)}>
          <Upload /> Import
        </Button>
        <Button size="sm" onClick={openQuickAdd} aria-keyshortcuts="N">
          <Plus /> Add <kbd className="ml-1 text-xs opacity-70">N</kbd>
        </Button>
      </TopBar>
      <div className="flex min-h-0 flex-1">
        {/* Step 6 */}
        <main className="relative min-w-0 flex-1">
          {seedError ? (
            <Centered title="This browser blocked local storage" detail="Connectwork keeps your data in this browser. Try a normal (not private) window." />
          ) : !loaded ? (
            <Centered title="Loading…" />
          ) : people.length === 0 ? (
            <Centered
              title="No one on your map yet"
              detail="Import your LinkedIn connections, press N to add someone, or use Settings → Reset demo data for the sample network."
            />
          ) : (
            <RingMap people={people} links={links} tags={tags} filterContext={filterContext} />
          )}
        </main>
        {/* Step 7 */}
        {selectedId && <PersonCard personId={selectedId} />}
      </div>
      <QuickAdd />
      {importLoaded && (
        <Suspense fallback={null}>
          <ImportDialog />
        </Suspense>
      )}
      <SettingsDialog />
      <Toaster position="bottom-center" />
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
