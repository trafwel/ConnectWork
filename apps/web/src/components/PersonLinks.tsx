/**
 * M3 — A person's connections · done
 *
 * WHAT THIS ACHIEVES
 *   Shows who this person is connected to (click a name to jump to them) and lets
 *   the user accept or reject AI-suggested links (M6) right from the card.
 *
 * Guide: §7.3
 */
import { useLiveQuery } from 'dexie-react-hooks';
import { Button } from '@/components/ui/button';
import { db } from '@/db/db';
import { acceptLink, removeLink } from '@/db/actions';
import { useStore } from '@/store/useStore';

export function PersonLinks({ personId }: { personId: string }) {
  const selectPerson = useStore((s) => s.selectPerson);
  const rows = useLiveQuery(async () => {
    const links = await db.links.where('fromId').equals(personId).or('toId').equals(personId).toArray();
    const others = await db.people.bulkGet(links.map((l) => (l.fromId === personId ? l.toId : l.fromId)));
    return links.map((l, i) => ({ link: l, other: others[i] })).filter((r) => r.other);
  }, [personId]);

  return (
    <section aria-labelledby="links-heading" className="space-y-2">
      <h3 id="links-heading" className="cw-eyebrow">
        Connected to
      </h3>
      {rows?.length ? (
        <ul className="space-y-1">
          {rows.map(({ link, other }) => (
            <li key={link.id} className="flex items-center gap-2 text-sm">
              <button className="truncate text-left underline-offset-2 hover:underline" onClick={() => selectPerson(other!.id)}>
                {other!.name}
              </button>
              {link.label && <span className="truncate text-xs text-muted-foreground">· {link.label}</span>}
              <span className="flex-1" />
              {link.status === 'suggested' ? (
                <>
                  <span className="text-xs text-muted-foreground">suggested</span>
                  <Button size="xs" onClick={() => acceptLink(link.id)}>
                    Accept
                  </Button>
                  <Button size="xs" variant="ghost" onClick={() => removeLink(link.id)}>
                    Reject
                  </Button>
                </>
              ) : (
                <Button size="xs" variant="ghost" onClick={() => removeLink(link.id)} aria-label={`Remove link to ${other!.name}`}>
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
