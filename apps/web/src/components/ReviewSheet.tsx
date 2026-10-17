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
 *   lib/aiFlows.ts (and later SnapDialog) → useStore.openReview(payload)
 *   → App.tsx renders this when rightPanel === 'review'
 *   → Accept calls payload.onAccept(accepted, rejected) → toast → closeReview().
 *   Selecting a person meanwhile shows their card; closing it returns here.
 *
 * HOW IT WAS BUILT
 *   1. Store: ReviewItem / ReviewPayload, openReview(), closeReview().
 *   2. Local state: the set of ticked ids (rows with checked !== false start ticked).
 *   3. Real checkboxes with labels; hover/focus highlights the row's people on the map.
 *   4. Accept selected / Accept all / Dismiss; buttons disabled while writing.
 *
 * Guide: docs/IMPLEMENTATION_GUIDE.md §12.4
 */
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useStore, type ReviewPayload } from '@/store/useStore';

export function ReviewSheet() {
  const payload = useStore((s) => s.reviewPayload);
  if (!payload) return null;
  // Keyed so local state resets for each new review.
  return <ReviewSheetBody key={payload.heading + payload.items.length} payload={payload} />;
}

function ReviewSheetBody({ payload }: { payload: ReviewPayload }) {
  const setHighlights = useStore((s) => s.setHighlights);
  const closeReview = useStore((s) => s.closeReview);
  const [checked, setChecked] = useState(() => new Set(payload.items.filter((i) => i.checked !== false).map((i) => i.id)));
  const [busy, setBusy] = useState(false);
  const allIds = useMemo(() => payload.items.map((i) => i.id), [payload.items]);

  const toggle = (id: string) =>
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const accept = async (ids: string[]) => {
    setBusy(true);
    try {
      const rejected = allIds.filter((id) => !ids.includes(id));
      await payload.onAccept(ids, rejected);
      toast.success(ids.length ? `Applied ${ids.length} ${ids.length === 1 ? 'change' : 'changes'}` : 'Nothing applied');
      closeReview();
    } catch (err) {
      toast.error((err as Error).message || 'Could not apply the changes');
      setBusy(false);
    }
  };

  const dismiss = async () => {
    setBusy(true);
    try {
      await payload.onDismiss?.();
    } finally {
      closeReview();
    }
  };

  return (
    <aside className="flex h-full w-[26rem] shrink-0 flex-col border-l bg-card" aria-label={payload.heading}>
      <div className="flex items-start justify-between gap-2 border-b p-4">
        <div className="min-w-0">
          <span className="cw-eyebrow">AI suggestions · you decide</span>
          <h2 className="text-lg font-semibold">{payload.heading}</h2>
          {payload.description && <p className="text-sm text-muted-foreground">{payload.description}</p>}
        </div>
        <Button variant="ghost" size="icon" aria-label="Dismiss suggestions" onClick={dismiss} disabled={busy}>
          <X />
        </Button>
      </div>

      <div className="flex items-center justify-between border-b px-4 py-2 text-sm">
        <span aria-live="polite">
          {checked.size} of {payload.items.length} selected
        </span>
        <Button
          variant="ghost"
          size="xs"
          onClick={() => setChecked(checked.size === allIds.length ? new Set() : new Set(allIds))}
        >
          {checked.size === allIds.length ? 'Select none' : 'Select all'}
        </Button>
      </div>

      <ul className="flex-1 overflow-y-auto" onMouseLeave={() => setHighlights([])}>
        {payload.items.map((item) => {
          const id = `review-${item.id}`;
          return (
            <li
              key={item.id}
              className="flex items-start gap-3 border-b px-4 py-2.5 hover:bg-muted/60"
              onMouseEnter={() => setHighlights(item.personIds)}
              onFocus={() => setHighlights(item.personIds)}
            >
              <input
                id={id}
                type="checkbox"
                className="mt-1 size-4 accent-[var(--primary)]"
                checked={checked.has(item.id)}
                onChange={() => toggle(item.id)}
                disabled={busy}
              />
              <label htmlFor={id} className="min-w-0 flex-1 cursor-pointer text-sm">
                <span className="block font-medium">{item.title}</span>
                {item.detail && <span className="block text-muted-foreground">{item.detail}</span>}
              </label>
            </li>
          );
        })}
      </ul>

      <div className="flex flex-wrap gap-2 border-t p-4">
        <Button onClick={() => accept([...checked])} disabled={busy || checked.size === 0}>
          {busy ? 'Applying…' : `Accept selected (${checked.size})`}
        </Button>
        <Button variant="outline" onClick={() => accept(allIds)} disabled={busy}>
          Accept all
        </Button>
        <Button variant="ghost" onClick={dismiss} disabled={busy}>
          Dismiss
        </Button>
      </div>
    </aside>
  );
}
