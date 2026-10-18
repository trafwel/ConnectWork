/**
 * Oct 18 (team request: "the LLM should be able to alter connections and nodes if asked in the
 * search bar") — the browser half of search-bar edits.
 *
 * WHAT THIS ACHIEVES
 *   "Connect Abbey and John", "move Theo to close", "remove all suggested connections": the
 *   question route also returns proposed edits. They open in the review sheet like every other AI
 *   suggestion, and only the ones the user accepts are written, through db/actions.ts.
 *
 * HOW IT FITS
 *   AgentBar → askQuery → cleanEdits (shared guard, again here) → planEdits (pure: one review row
 *   per edit, dropping no-ops such as removing a link that doesn't exist) → openReview → on
 *   Accept, applyEdits. Removing a person starts unticked: deleting someone is never one click away.
 */
import type { Link, NetworkEdit, Person, Tag } from '@connectwork/shared';
import { addPerson, connectPeople, deletePerson, normalizeLink, removeLink, resolveLinks, updatePerson } from '@/db/actions';
import { db } from '@/db/db';
import { useStore } from '@/store/useStore';

const RING: Record<1 | 2 | 3, string> = { 1: 'close (ring 1)', 2: 'regular (ring 2)', 3: 'wider (ring 3)' };

export interface PlannedEdit {
  id: string;
  edit: NetworkEdit;
  title: string;
  detail?: string;
  personIds: string[];
  checked?: boolean;
}

const findLink = (links: Link[], a: string, b: string) => {
  const [fromId, toId] = normalizeLink(a, b);
  return links.find((l) => l.fromId === fromId && l.toId === toId);
};

/** Pure: what each edit would do to THIS network, in words, minus edits that would change nothing. */
export function planEdits(edits: NetworkEdit[], people: Person[], links: Link[], tags: Tag[]): PlannedEdit[] {
  const byId = new Map(people.map((p) => [p.id, p]));
  const name = (id: string) => byId.get(id)?.name ?? 'someone';
  const tagNamed = (t: string) => tags.find((x) => x.name.toLowerCase() === t.toLowerCase())?.name;
  const out: PlannedEdit[] = [];
  edits.forEach((edit, i) => {
    const id = `edit-${i}`;
    const [a, b] = edit.personIds as [string, string];
    switch (edit.op) {
      case 'add_link': {
        if (findLink(links, a, b)?.status === 'accepted') return; // already connected
        out.push({ id, edit, title: `Connect ${name(a)} ↔ ${name(b)}`, detail: edit.label, personIds: [a, b] });
        return;
      }
      case 'remove_link': {
        if (!findLink(links, a, b)) return;
        out.push({ id, edit, title: `Disconnect ${name(a)} ↔ ${name(b)}`, personIds: [a, b] });
        return;
      }
      case 'remove_suggested_links': {
        const suggested = links.filter((l) => l.status === 'suggested');
        if (!suggested.length) return;
        const n = suggested.length;
        out.push({ id, edit, title: `Remove ${n} suggested ${n === 1 ? 'connection' : 'connections'}`, detail: 'AI suggestions you never accepted', personIds: [] });
        return;
      }
      case 'set_ring': {
        if (!edit.ring || byId.get(a)?.ring === edit.ring) return;
        out.push({ id, edit, title: `Move ${name(a)} to ${RING[edit.ring]}`, personIds: [a] });
        return;
      }
      case 'set_tag': {
        // Only existing groups: a typo shouldn't create a new color on the map.
        const tag = edit.tag && tagNamed(edit.tag);
        if (!tag || byId.get(a)?.primaryTag === tag) return;
        out.push({ id, edit: { ...edit, tag }, title: `Put ${name(a)} in ${tag}`, personIds: [a] });
        return;
      }
      case 'add_person': {
        if (!edit.name || people.some((p) => p.name.toLowerCase() === edit.name!.toLowerCase())) return;
        const tag = (edit.tag && tagNamed(edit.tag)) || (edit.company ? 'Work' : 'Friends');
        const about = [edit.role, edit.company].filter(Boolean).join(' at ');
        out.push({ id, edit: { ...edit, tag }, title: `Add ${edit.name}`, detail: [about, tag, RING[edit.ring ?? 3]].filter(Boolean).join(' · '), personIds: [] });
        return;
      }
      case 'remove_person': {
        if (!byId.has(a)) return;
        out.push({ id, edit, title: `Remove ${name(a)} from your map`, detail: 'Also deletes their reminders and connections', personIds: [a], checked: false });
        return;
      }
    }
  });
  return out;
}

/** Writes the accepted edits, re-reading the database so nothing acts on a stale snapshot. */
export async function applyEdits(planned: PlannedEdit[]): Promise<number> {
  let done = 0;
  for (const { edit } of planned) {
    const [a, b] = edit.personIds as [string, string];
    switch (edit.op) {
      case 'add_link':
        if (await connectPeople(a, b, edit.label)) done++;
        break;
      case 'remove_link': {
        const link = findLink(await db.links.toArray(), a, b);
        if (link) {
          await removeLink(link.id);
          done++;
        }
        break;
      }
      case 'remove_suggested_links': {
        const ids = (await db.links.toArray()).filter((l) => l.status === 'suggested').map((l) => l.id);
        await resolveLinks([], ids);
        done++;
        break;
      }
      case 'set_ring':
        await updatePerson(a, { ring: edit.ring });
        done++;
        break;
      case 'set_tag': {
        const p = await db.people.get(a);
        if (p && edit.tag) {
          await updatePerson(a, { primaryTag: edit.tag, tags: [edit.tag, ...p.tags.filter((t) => t !== edit.tag)] });
          done++;
        }
        break;
      }
      case 'add_person':
        await addPerson({ name: edit.name!, ring: edit.ring ?? 3, primaryTag: edit.tag ?? 'Friends', company: edit.company || undefined, role: edit.role || undefined });
        done++;
        break;
      case 'remove_person':
        if (await deletePerson(a)) done++;
        break;
    }
  }
  return done;
}

/** Shows the edits in the review sheet. Returns false when none of them would change anything. */
export async function proposeEdits(edits: NetworkEdit[]): Promise<boolean> {
  const [people, links, tags] = await Promise.all([db.people.toArray(), db.links.toArray(), db.tags.toArray()]);
  const planned = planEdits(edits, people, links, tags);
  if (!planned.length) return false;
  useStore.getState().openReview({
    kind: 'edits',
    heading: `${planned.length} proposed ${planned.length === 1 ? 'change' : 'changes'}`,
    note: 'From your request in the search bar. Nothing changes until you accept.',
    items: planned.map(({ id, title, detail, personIds, checked }) => ({ id, title, detail, personIds, checked })),
    onAccept: async (ids) => {
      const chosen = new Set(ids);
      await applyEdits(planned.filter((p) => chosen.has(p.id))); // the sheet confirms with a toast
    },
  });
  return true;
}
