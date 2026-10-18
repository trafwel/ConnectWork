/**
 * M6 — AI flows in the browser: auto-sort and hidden links · done
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
 *      f. onAccept(ids): applyClassification(accepted items) — ONE transaction, and it keeps
 *         the user's own tags (M6 review: replacing tags would drop tags added after import).
 *   2. findHiddenLinks():
 *      a. summary = buildSummary(people, links, reminders) (lib/graphSummary.ts).
 *      b. res = aiPost('/links', { summary }, LinksResponse); drop confidence < 0.5.
 *      c. Write them with addSuggestedLinks (one transaction) so the dashed lines appear
 *         immediately on the map.
 *      d. Open the review "N possible connections"; onAccept → resolveLinks(accepted, rest);
 *         onDismiss removes the links THIS run created (M6 review: otherwise "Dismiss
 *         changes nothing" would be false).
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

import { ClassifyResponse, LinksResponse, type Person } from '@connectwork/shared';
import { toast } from 'sonner';
import { addSuggestedLinks, applyClassification, resolveLinks } from '@/db/actions';
import { db } from '@/db/db';
import { aiPost } from './api';
import { PRIMARY_TAGS } from './colors';
import { buildSummary } from './graphSummary';
import { useStore } from '@/store/useStore';

/** The schema's per-call maximum; bigger imports go in several calls. */
const CHUNK = 150;
/** One AI flow at a time: a double click must not start two 20-second calls. */
let running = false;

async function once(fn: () => Promise<void>): Promise<void> {
  if (running) {
    toast('Already working on it…');
    return;
  }
  running = true;
  try {
    await fn();
  } finally {
    running = false;
  }
}

/** Only what the model needs to sort someone, capped like the schema. No notes, no tags. */
const brief = (p: Person) => ({
  id: p.id,
  name: p.name.slice(0, 120),
  company: p.company?.slice(0, 300),
  role: p.role?.slice(0, 300),
  school: p.school?.slice(0, 300),
  metAt: p.metAt,
});

// Step 1
export function sortWithAi(personIds: string[]): Promise<void> {
  return once(async () => {
    const people = (await db.people.bulkGet(personIds)).filter((p): p is Person => Boolean(p));
    if (!people.length) return;
    const tags = PRIMARY_TAGS.filter((t) => t !== 'LinkedIn');
    const about = (await db.meta.get('userContext'))?.value;
    const userContext = typeof about === 'string' && about.trim() ? about.trim().slice(0, 500) : undefined;

    const items: ClassifyResponse['items'] = [];
    for (let i = 0; i < people.length; i += CHUNK) {
      toast.loading(`Sorting ${Math.min(i + CHUNK, people.length)} of ${people.length}…`, { id: 'sort' });
      const res = await aiPost('/classify', { people: people.slice(i, i + CHUNK).map(brief), tags, userContext }, ClassifyResponse);
      if (!res.ok) {
        toast.error(res.message, { id: 'sort' });
        return;
      }
      items.push(...res.data.items);
    }
    toast.dismiss('sort');
    if (!items.length) {
      toast('The AI had no suggestions for these people');
      return;
    }

    const byId = new Map(people.map((p) => [p.id, p]));
    // M6-O1: the model can silently skip people; say who, so nobody wonders why they're still gray.
    const suggested = new Set(items.map((it) => it.id));
    const skipped = people.filter((p) => !suggested.has(p.id)).map((p) => p.name);
    const note = skipped.length
      ? `${skipped.length === 1 ? '1 person had no suggestion and stays' : `${skipped.length} people had no suggestion and stay`} unsorted: ${skipped.slice(0, 5).join(', ')}${skipped.length > 5 ? ', …' : ''}`
      : undefined;
    useStore.getState().openReview({
      heading: `Sort ${items.length} ${items.length === 1 ? 'person' : 'people'}`,
      note,
      items: items.map((it) => ({
        id: it.id,
        title: `${byId.get(it.id)?.name ?? it.id} → ring ${it.ring}, ${it.primaryTag}`,
        detail: it.reason,
        personIds: [it.id],
      })),
      onAccept: (ids) => applyClassification(items.filter((it) => ids.includes(it.id))),
    });
  });
}

// Step 2
export function findHiddenLinks(): Promise<void> {
  return once(async () => {
    const [people, links, reminders] = await Promise.all([db.people.toArray(), db.links.toArray(), db.reminders.toArray()]);
    if (people.length < 2) return;
    toast.loading('Looking for people who might know each other…', { id: 'links' });
    const res = await aiPost('/links', { summary: buildSummary(people, links, reminders) }, LinksResponse);
    if (!res.ok) {
      toast.error(res.message, { id: 'links' });
      return;
    }
    toast.dismiss('links');

    const confident = res.data.links.filter((l) => l.confidence >= 0.5);
    const written = await addSuggestedLinks(confident);
    if (!written.length) {
      toast('No new connections found');
      return;
    }

    const names = new Map(people.map((p) => [p.id, p.name]));
    const confidence = new Map(confident.map((l) => [[l.fromId, l.toId].sort().join('|'), l.confidence]));
    const sureOf = (l: { fromId: string; toId: string }) => confidence.get([l.fromId, l.toId].sort().join('|')) ?? 0.5;
    useStore.getState().openReview({
      heading: `${written.length} possible ${written.length === 1 ? 'connection' : 'connections'}`,
      // Strongest first: the model lists pairs in summary order, which buried a 90% match under
      // a dozen 50% ones. sort() is stable, so equal scores keep the model's order.
      items: [...written].sort((a, b) => sureOf(b) - sureOf(a)).map((l) => ({
        id: l.id,
        title: `${names.get(l.fromId)} ↔ ${names.get(l.toId)}`,
        detail: `${l.label} · ${Math.round(sureOf(l) * 100)}% sure`,
        personIds: [l.fromId, l.toId],
      })),
      onAccept: (ids) =>
        resolveLinks(
          ids,
          written.filter((l) => !ids.includes(l.id)).map((l) => l.id),
        ),
      onDismiss: () => resolveLinks([], written.filter((l) => l.created).map((l) => l.id)),
    });
  });
}
