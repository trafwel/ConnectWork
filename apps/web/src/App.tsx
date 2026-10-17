/**
 * App shell · M0 state (grows in every milestone)
 *
 * WHAT THIS DOES NOW (M0)
 *   Proves the whole stack runs: the web app calls GET /api/health through Vite's
 *   proxy and shows "Server ok · <model> · <tier> tier".
 *
 * WHAT IT BECOMES
 *   The single screen of Connectwork: a top bar (agent question box, Find hidden
 *   links, Import, Add), the demo banner, the ring map in the middle, and a right
 *   panel (person card, review sheet, weekly review, meeting prep).
 *
 * STEPS — add these as you build each milestone
 *   M1  1. On mount, call ensureSeeded() (db/seed.ts) and keep a `ready` flag.
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

type Health = { ok: boolean; model: string; tier: string; cache: string };

export default function App() {
  const [health, setHealth] = useState<Health | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch('/api/health')
      .then((r) => r.json() as Promise<Health>)
      .then(setHealth)
      .catch(() => setError(true));
  }, []);

  return (
    <main className="flex h-screen items-center justify-center bg-slate-50 text-slate-900">
      <div className="text-center">
        <h1 className="text-3xl font-semibold">Connectwork</h1>
        <p className="mt-2 text-slate-600">Let Connectwork connect your world.</p>
        <p className="mt-6 text-sm" aria-live="polite">
          {error ? 'Server unreachable' : health ? `Server ok · ${health.model} · ${health.tier} tier` : 'Checking server…'}
        </p>
      </div>
    </main>
  );
}
