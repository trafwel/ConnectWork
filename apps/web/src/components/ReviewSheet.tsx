/**
 * M6 — ReviewSheet: accept or reject AI proposals · Owner: Person B · ~40 min
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

export function ReviewSheet() {
  // TODO(M6) steps 3a–3e
  return null;
}
