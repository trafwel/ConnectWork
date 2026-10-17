/**
 * M3 — A person's connections · Owner: Person A · ~30 min
 *
 * WHAT THIS ACHIEVES
 *   Shows who this person is connected to (click a name to jump to them) and lets
 *   the user accept or reject AI-suggested links (M6) right from the card.
 *
 * STEPS
 *   1. useLiveQuery: links where fromId or toId is this person
 *      (db.links.where('fromId').equals(id).or('toId').equals(id)), then bulkGet the other people;
 *      drop rows whose other person no longer exists.
 *   2. Each row: the other person's name as a button (selectPerson(other.id)), the link label in
 *      muted text, and on the right:
 *        suggested → "suggested" + Accept (acceptLink) + Reject (removeLink)
 *        accepted  → Remove (removeLink; aria-label "Remove link to <name>")
 *   3. Empty state: "No links yet".
 *
 * Guide: §7.3
 */

export function PersonLinks(_props: { personId: string }) {
  // TODO(M3) steps 1–3
  return null;
}
