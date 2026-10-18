/**
 * M3 — A person's connections · done
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

import { useLiveQuery } from 'dexie-react-hooks';
import { toast } from 'sonner';
import type { Link } from '@connectwork/shared';
import { Button } from '@/components/ui/button';
import { acceptLink, removeLink, upsertLink } from '@/db/actions';
import { db } from '@/db/db';
import { sectionHeading } from '@/lib/utils';
import { useStore } from '@/store/useStore';

/** There is no "add link" button until M6, so a removal gets an Undo. */
async function removeWithUndo(link: Link, otherName: string) {
  await removeLink(link.id);
  toast(`Removed link to ${otherName}`, {
    action: { label: 'Undo', onClick: () => void upsertLink(link.fromId, link.toId, { source: link.source, status: link.status, label: link.label }) },
  });
}

export function PersonLinks({ personId }: { personId: string }) {
  const selectPerson = useStore((s) => s.selectPerson);
  // Step 1. One query for the links, one bulkGet for the other people (not one get per link).
  const rows = useLiveQuery(async () => {
    const links = await db.links.where('fromId').equals(personId).or('toId').equals(personId).toArray();
    const others = await db.people.bulkGet(links.map((l) => (l.fromId === personId ? l.toId : l.fromId)));
    return links.flatMap((link, i) => (others[i] ? [{ link, other: others[i] }] : []));
  }, [personId]);

  return (
    <section aria-labelledby="links-heading" className="space-y-2">
      <h3 id="links-heading" className={sectionHeading}>
        Connected to
      </h3>
      {rows?.length ? (
        <ul className="space-y-1">
          {rows.map(({ link, other }) => (
            <li key={link.id} className="flex items-center gap-2 text-sm">
              <button className="truncate text-left underline-offset-2 hover:underline" onClick={() => selectPerson(other.id)}>
                {other.name}
              </button>
              {link.label && <span className="truncate text-xs text-muted-foreground">· {link.label}</span>}
              <span className="flex-1" />
              {link.status === 'suggested' ? (
                <>
                  <span className="text-xs text-muted-foreground">suggested</span>
                  <Button size="xs" onClick={() => acceptLink(link.id)} aria-label={`Accept link to ${other.name}`}>
                    Accept
                  </Button>
                  <Button size="xs" variant="ghost" onClick={() => removeLink(link.id)} aria-label={`Reject link to ${other.name}`}>
                    Reject
                  </Button>
                </>
              ) : (
                <Button size="xs" variant="ghost" onClick={() => removeWithUndo(link, other.name)} aria-label={`Remove link to ${other.name}`}>
                  Remove
                </Button>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">No links yet</p>
      )}
    </section>
  );
}
