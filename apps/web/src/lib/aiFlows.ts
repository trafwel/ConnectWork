/**
 * M6 — AI flows in the browser: auto-sort and hidden links · done
 *
 * WHAT THIS ACHIEVES
 *   "Sort with AI" turns a big gray import into colored clusters; "Find hidden
 *   links" draws dashed lines between people who should know each other. In
 *   both cases the AI only PROPOSES: everything goes through ReviewSheet, and
 *   Dexie changes only for what the user accepts (suggested links are shown
 *   immediately as dashed lines and removed again if rejected or dismissed).
 *
 * HOW IT FITS
 *   ImportDialog toast action → sortWithAi(newIds)
 *   TopBar "Find hidden links" → findHiddenLinks()
 *   Both → aiPost (lib/api.ts) → /api/ai/classify | /links → useStore.openReview
 *   → ReviewSheet → onAccept writes via db/actions.ts.
 *
 * HOW IT WAS BUILT
 *   1. sortWithAi: chunks of 150 (the schema max) with a progress toast; the user's
 *      "About you" text from Settings goes along to improve ring suggestions.
 *   2. findHiddenLinks: summary → /links → confidence ≥ 0.5 → written as `suggested`
 *      (dashed) → review; accepted become `accepted`, the rest are removed.
 *
 * Guide: docs/IMPLEMENTATION_GUIDE.md §12.5–12.6
 */
import { toast } from 'sonner';
import { ClassifyResponse, LinksResponse, type Person } from '@connectwork/shared';
import { db } from '@/db/db';
import { acceptLink, normalizeLink, removeLink, updatePerson, upsertLink } from '@/db/actions';
import { aiPost } from '@/lib/api';
import { PRIMARY_TAGS } from '@/lib/colors';
import { buildSummary } from '@/lib/graphSummary';
import { useStore } from '@/store/useStore';

const CHUNK = 150;
const MIN_LINK_CONFIDENCE = 0.5;
const RING_NAMES = { 1: 'Close', 2: 'Regular', 3: 'Wider' } as const;

export async function sortWithAi(personIds: string[]): Promise<void> {
  const people = (await db.people.bulkGet(personIds)).filter((p): p is Person => Boolean(p));
  if (!people.length) return;
  const names = new Map(people.map((p) => [p.id, p.name]));
  const tags = PRIMARY_TAGS.filter((t) => t !== 'LinkedIn');
  const userContext = ((await db.meta.get('userContext'))?.value as string | undefined)?.trim() || undefined;

  const items: ClassifyResponse['items'] = [];
  toast.loading(`Sorting ${people.length} people with AI…`, { id: 'sort' });
  for (let i = 0; i < people.length; i += CHUNK) {
    const chunk = people
      .slice(i, i + CHUNK)
      .map(({ id, name, company, role, school, metAt }) => ({ id, name, company, role, school, metAt }));
    const res = await aiPost('/classify', { people: chunk, tags, userContext }, ClassifyResponse);
    if (!res.ok) {
      toast.error(res.message, { id: 'sort' });
      return;
    }
    items.push(...res.data.items);
    toast.loading(`Sorted ${Math.min(i + CHUNK, people.length)} of ${people.length}…`, { id: 'sort' });
  }
  toast.dismiss('sort');
  if (!items.length) {
    toast.info('The AI had no suggestions for these people.');
    return;
  }

  const byId = new Map(items.map((it) => [it.id, it]));
  useStore.getState().openReview({
    heading: `Sort ${items.length} imported ${items.length === 1 ? 'person' : 'people'}`,
    description: userContext ? 'Using what you wrote in Settings → About you.' : 'Tip: add "About you" in Settings for better ring suggestions.',
    items: items.map((it) => {
      const extra = it.tags.filter((t) => t !== it.primaryTag);
      return {
        id: it.id,
        title: `${names.get(it.id) ?? it.id} → ${RING_NAMES[it.ring]} · ${it.primaryTag}${extra.length ? ` (+${extra.join(', ')})` : ''}`,
        detail: it.reason,
        personIds: [it.id],
      };
    }),
    onAccept: async (accepted) => {
      // One outer transaction: 100+ updates apply at once instead of one transaction each.
      await db.transaction('rw', [db.people, db.tags, db.reminders], async () => {
        for (const id of accepted) {
          const it = byId.get(id);
          if (it) await updatePerson(id, { ring: it.ring, primaryTag: it.primaryTag, tags: [...new Set([it.primaryTag, ...it.tags])] });
        }
      });
    },
  });
}

export async function findHiddenLinks(): Promise<void> {
  const [people, links, reminders] = await Promise.all([db.people.toArray(), db.links.toArray(), db.reminders.toArray()]);
  if (people.length < 2) return;
  const names = new Map(people.map((p) => [p.id, p.name]));

  toast.loading('Looking for people who should know each other…', { id: 'links' });
  const res = await aiPost('/links', { summary: buildSummary(people, links, reminders) }, LinksResponse);
  if (!res.ok) {
    toast.error(res.message, { id: 'links' });
    return;
  }
  toast.dismiss('links');

  const found = res.data.links.filter((l) => l.confidence >= MIN_LINK_CONFIDENCE && names.has(l.fromId) && names.has(l.toId));
  if (!found.length) {
    toast.info('No new connections found.');
    return;
  }

  // Show them on the map right away as dashed "suggested" lines.
  const created = new Map<string, string>(); // review item id → link id
  for (const l of found) {
    await upsertLink(l.fromId, l.toId, { source: 'ai', status: 'suggested', label: l.label });
    const [fromId, toId] = normalizeLink(l.fromId, l.toId);
    const link = await db.links.where({ fromId }).filter((x) => x.toId === toId).first();
    if (link && link.status === 'suggested') created.set(`${fromId}|${toId}`, link.id);
  }

  const removeSuggested = async (itemIds: string[]) => {
    for (const id of itemIds) {
      const linkId = created.get(id);
      const link = linkId ? await db.links.get(linkId) : undefined;
      if (link && link.status === 'suggested' && link.source === 'ai') await removeLink(link.id);
    }
  };

  useStore.getState().openReview({
    heading: `${created.size} possible ${created.size === 1 ? 'connection' : 'connections'}`,
    description: 'People in your network who probably know each other. Dashed lines on the map.',
    items: found
      .map((l) => {
        const [fromId, toId] = normalizeLink(l.fromId, l.toId);
        return {
          id: `${fromId}|${toId}`,
          title: `${names.get(fromId)} ↔ ${names.get(toId)}`,
          detail: `${l.label} · ${Math.round(l.confidence * 100)}% confident`,
          personIds: [fromId, toId],
        };
      })
      .filter((item) => created.has(item.id)),
    onAccept: async (accepted, rejected) => {
      for (const id of accepted) {
        const linkId = created.get(id);
        if (linkId) await acceptLink(linkId);
      }
      await removeSuggested(rejected);
    },
    onDismiss: () => removeSuggested([...created.keys()]),
  });
}
