/**
 * M9 — SnapDialog: photo or PDF → people · Owner: Person B · ~45 min
 *
 * WHAT THIS ACHIEVES
 *   The fastest way to add people you met in person: snap the business card,
 *   or drop the club roster, and review who was found. Strong live-demo moment
 *   (hold up a real card to the camera) and our "Best Use of Gemini" story.
 *
 * HOW IT FITS
 *   TopBar "Snap" → this dialog → lib/image.ts → aiPost('/extract') →
 *   dedupe with findMatch (lib/csv.ts) → useStore.openReview(...) →
 *   onAccept → applyImport({ toAdd, toUpdate: [] }, 'snap', tag) (db/actions.ts).
 *
 * STEPS
 *   1. Store: a 'snap' dialog flag (extend setDialog), TopBar "Snap" button (lucide `Camera`).
 *   2. Dialog body: <input type="file" accept="image/*,application/pdf" capture="environment">
 *      (phones open the camera), a thumbnail preview for images, "Reading…" while waiting.
 *      Use initialFocus on the file button (Base UI dialogs ignore autoFocus).
 *   3. Call fileToPayload(file), then aiPost('/extract', { file, tags: PRIMARY_TAGS }, ExtractResponse).
 *   4. For each person: findMatch(existingPeople, draft). Matches become rows with
 *      detail "already in your network" and checked: false.
 *   5. openReview({ heading: `Add N people from ${file.name}`, items, onAccept }) and close the dialog.
 *   6. onAccept: tag = suggestedTag if it's a known tag, else 'Clubs' for multi-person
 *      files and 'Work' for a single card; set lastContact = today (you just met);
 *      applyImport(…, 'snap', tag).
 *   7. Errors (too big, unreadable, AI busy) → toast.error with the message.
 *
 * DONE WHEN
 *   - demo/roster.pdf → 8 people in the review; a phone photo of a card → 1 person.
 *
 * Guide: §16
 */

export function SnapDialog() {
  // TODO(M9) steps 2–7
  return null;
}
