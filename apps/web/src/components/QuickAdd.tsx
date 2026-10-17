/**
 * M3 — Quick add (press N) · Owner: Person A · ~40 min
 *
 * WHAT THIS ACHIEVES
 *   Adding a person takes under 10 seconds: name, ring, tag, Enter. Details come
 *   later from the card. Low friction is the point of the Cook Smarter track.
 *
 * HOW IT FITS
 *   Opened by the N hotkey (lib/useHotkey.ts) or the "+ Add" button (store.quickAddOpen);
 *   writes with addPerson (db/actions.ts).
 *
 * STEPS
 *   1. Controlled shadcn Dialog (open={quickAddOpen}); reset the fields when it closes.
 *   2. Focus the Name input on open: pass `initialFocus={nameRef}` to <DialogContent>.
 *      Our dialogs are Base UI, which IGNORES autoFocus — we lost time on this.
 *   3. A <form onSubmit> with: Name (<Label htmlFor> + <Input>), Ring (<RingPicker>, default 2),
 *      Tag (<TagSelect>, default 'Friends'), and a submit button "Add · Enter" disabled
 *      while the name is empty.
 *   4. On submit: preventDefault; addPerson({ name, ring, primaryTag: tag }); close;
 *      toast.success(`Added ${name}`, { action: { label: 'Open card', onClick: () => selectPerson(id) } }).
 *
 * DONE WHEN
 *   - N → type a name → Enter adds a node immediately, in under 10 seconds.
 *
 * Guide: §7.2
 */

export function QuickAdd() {
  // TODO(M3) steps 1–4
  return null;
}
