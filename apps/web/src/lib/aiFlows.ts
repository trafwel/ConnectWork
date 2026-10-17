/**
 * M6 — AI flows in the browser: auto-sort and hidden links · Owner: Person B · ~45 min
 *
 * WHAT THIS ACHIEVES
 *   The glue between the buttons and the AI routes. "Sort with AI" turns a big
 *   gray import into colored clusters; "Find hidden links" draws dashed lines
 *   between people who should know each other. In both cases the AI only
 *   PROPOSES: everything goes through ReviewSheet, and Dexie changes only for
 *   what the user accepts. That rule is a core part of our privacy/trust story.
 *
 * HOW IT FITS
 *   ImportDialog toast action → sortWithAi(newIds)
 *   TopBar "Find hidden links" button → findHiddenLinks()
 *   Both → aiPost (lib/api.ts, added in step R) → /api/ai/classify | /links
 *        → useStore.openReview(...) → ReviewSheet → onAccept writes via db/actions.ts
 *
 * STEPS
 *   1. sortWithAi(ids):
 *      a. Load the people (db.people.bulkGet(ids)), drop missing ones.
 *      b. tags = PRIMARY_TAGS without 'LinkedIn' (from lib/colors.ts).
 *      c. userContext = (await db.meta.get('userContext'))?.value (Settings "About you").
 *      d. Send in chunks of 150 (the schema max). Show progress with
 *         toast.loading(`Sorted X of N…`, { id: 'sort' }). On an error result,
 *         toast.error(res.message, { id: 'sort' }) and stop.
 *      e. Open the review: one row per item, title "Name → ring 2, Work",
 *         detail = reason, personIds = [id].
 *      f. onAccept(ids): for each accepted item call updatePerson(id, { ring,
 *         primaryTag, tags: unique([primaryTag, ...tags]) }).
 *   2. findHiddenLinks():
 *      a. summary = buildSummary(people, links, reminders) (lib/graphSummary.ts).
 *      b. res = aiPost('/links', { summary }, LinksResponse); drop confidence < 0.5.
 *      c. Write each as upsertLink(a, b, { source: 'ai', status: 'suggested', label })
 *         so the dashed lines appear immediately on the map.
 *      d. Open the review "N possible connections"; onAccept → acceptLink for
 *         accepted rows, removeLink for the rest.
 *      e. No links found → toast "No new connections found".
 *   3. Wire the buttons: ImportDialog's success toast gets
 *      action: { label: 'Sort with AI', onClick: () => sortWithAi(newIds) }
 *      (applyImport already returns the new ids); TopBar gets a
 *      "Find hidden links" button (lucide `Waypoints` icon).
 *   4. Settings: add an "About you" textarea saved to db.meta key 'userContext'.
 *
 * DONE WHEN
 *   - Import demo/Connections.csv → Sort with AI → Accept all → clusters appear.
 *   - Find hidden links on the seed → Abbey Chen ↔ John Park is suggested.
 *   - Dismissing a review changes nothing.
 *
 * Guide: docs/IMPLEMENTATION_GUIDE.md §12.5–12.6
 */

export async function sortWithAi(_personIds: string[]): Promise<void> {
  // TODO(M6) step 1a–1f
  throw new Error('TODO(M6): sortWithAi is not implemented yet');
}

export async function findHiddenLinks(): Promise<void> {
  // TODO(M6) step 2a–2e
  throw new Error('TODO(M6): findHiddenLinks is not implemented yet');
}
