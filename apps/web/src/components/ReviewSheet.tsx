/**
 * M6 — ReviewSheet: accept or reject AI proposals · done
 *
 * WHAT THIS ACHIEVES
 *   One reusable right-hand panel for every "the AI suggests, you decide"
 *   moment: auto-sort (M6), hidden links (M6), snap to add (M9). The user sees
 *   each proposal with its reason, hovers to see who it's about on the map,
 *   unticks what's wrong, and accepts the rest. Nothing is written before this.
 *
 * HOW IT FITS
 *   aiFlows.ts / SnapDialog → useStore.getState().openReview(payload)
 *   → App.tsx renders <ReviewSheet /> when rightPanel === 'review'
 *   → Accept calls payload.onAccept(selectedIds) → toast → closeReview().
 *
 * STEPS
 *   1. Store (store/useStore.ts), add:
 *        export interface ReviewItem { id: string; title: string; detail?: string; personIds: string[]; checked?: boolean }
 *        export interface ReviewPayload { heading: string; items: ReviewItem[]; onAccept: (ids: string[]) => Promise<void> }
 *        reviewPayload: ReviewPayload | null;
 *        openReview: (p: ReviewPayload) => void;   // sets reviewPayload and rightPanel: 'review'
 *        closeReview: () => void;                  // clears both and highlights
 *   2. App.tsx: when rightPanel === 'review' render <ReviewSheet />, else when a
 *      person is selected render <PersonCard />.
 *   3. This component:
 *      a. Read reviewPayload from the store; return null if there is none.
 *      b. Local state: a Set of checked ids (default: items where checked !== false).
 *      c. Header: heading + "N selected"; a list of rows with a real
 *         <input type="checkbox"> + <label> (title, then detail in muted text).
 *      d. onMouseEnter/onFocus of a row → setHighlights(item.personIds);
 *         onMouseLeave → setHighlights([]).
 *      e. Footer buttons: "Accept selected", "Accept all", "Dismiss".
 *         While accepting, disable buttons; afterwards toast.success(`Applied N changes`)
 *         and closeReview(). Catch errors → toast.error.
 *   4. Same width and styling as PersonCard (w-[26rem], border-l, bg-background).
 *
 * DONE WHEN
 *   - Hovering a row highlights the right people; Dismiss changes nothing;
 *     Accept writes only the ticked rows. Works with keyboard only.
 *
 * Guide: §12.4
 */

import { useState } from 'react';
import { X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { useStore, type ReviewPayload } from '@/store/useStore';

export function ReviewSheet() {
  // Step 3a
  const payload = useStore((s) => s.reviewPayload);
  if (!payload) return null;
  // key: a new review starts with fresh checkboxes
  return <Sheet key={payload.heading + payload.items.length} payload={payload} />;
}

function Sheet({ payload }: { payload: ReviewPayload }) {
  const setHighlights = useStore((s) => s.setHighlights);
  const closeReview = useStore((s) => s.closeReview);
  // Step 3b
  const [checked, setChecked] = useState(() => new Set(payload.items.filter((i) => i.checked !== false).map((i) => i.id)));
  const [busy, setBusy] = useState(false);

  const toggle = (id: string) =>
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  // Step 3e
  const finish = async (action: () => Promise<void>, message: string) => {
    setBusy(true);
    try {
      await action();
      closeReview();
      toast.success(message);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not apply the changes');
    } finally {
      setBusy(false);
    }
  };
  const accept = (ids: string[]) => finish(() => payload.onAccept(ids), `Applied ${ids.length} ${ids.length === 1 ? 'change' : 'changes'}`);
  const dismiss = () => finish(() => payload.onDismiss?.() ?? Promise.resolve(), 'Nothing was changed');

  // Step 4
  return (
    <aside className="flex h-full w-[26rem] shrink-0 flex-col border-l bg-background" aria-label="Review suggestions">
      {/* Step 3c */}
      <div className="flex items-start justify-between gap-2 border-b p-4">
        <div>
          <h2 className="text-lg font-semibold">{payload.heading}</h2>
          <p className="text-sm text-muted-foreground">
            {checked.size} selected · nothing is saved until you accept
          </p>
        </div>
        <Button variant="ghost" size="icon" aria-label="Dismiss suggestions" disabled={busy} onClick={dismiss}>
          <X />
        </Button>
      </div>
      <ul className="flex-1 space-y-1 overflow-y-auto p-2" aria-label="Suggestions">
        {payload.items.map((item) => (
          <li
            key={item.id}
            // Step 3d: hover or keyboard focus shows who the suggestion is about
            onMouseEnter={() => setHighlights(item.personIds)}
            onMouseLeave={() => setHighlights([])}
            onFocus={() => setHighlights(item.personIds)}
            onBlur={() => setHighlights([])}
          >
            <label className="flex cursor-pointer items-start gap-2 rounded-md p-2 text-sm hover:bg-muted">
              <input type="checkbox" className="mt-0.5" checked={checked.has(item.id)} onChange={() => toggle(item.id)} />
              <span className="min-w-0">
                <span className="block font-medium">{item.title}</span>
                {item.detail && <span className="block text-muted-foreground">{item.detail}</span>}
              </span>
            </label>
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap justify-end gap-2 border-t p-3">
        <Button variant="ghost" disabled={busy} onClick={dismiss}>
          Dismiss
        </Button>
        <Button variant="outline" disabled={busy} onClick={() => accept(payload.items.map((i) => i.id))}>
          Accept all
        </Button>
        <Button disabled={busy || checked.size === 0} onClick={() => accept([...checked])}>
          Accept selected
        </Button>
      </div>
    </aside>
  );
}
