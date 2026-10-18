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
 * BUG FIX (Oct 17) — the team asked for named connections and a way to add them by hand
 *   4. "Add connection": pick another person (a searchable list of everyone except this person
 *      and people already linked) and, optionally, name the relationship. Saved as an accepted
 *      user link through the same upsertLink every other link uses (so no self-links, no duplicates).
 *   5. Each row's relationship name is a button: click to rename (Enter saves, Escape cancels,
 *      empty clears). With no name it shows what the map shows: what the two share.
 *
 * Guide: §7.3
 */

import { useId, useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import type { Link, Person } from '@connectwork/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { acceptLink, LINK_LABEL_MAX, removeLink, renameLink, upsertLink } from '@/db/actions';
import { db } from '@/db/db';
import { relationshipLabel } from '@/graph/labels';
import { sectionHeading } from '@/lib/utils';
import { useStore } from '@/store/useStore';

/** A removal is easy to do by accident and tedious to redo, so it gets an Undo. */
async function removeWithUndo(link: Link, otherName: string) {
  await removeLink(link.id);
  toast(`Removed link to ${otherName}`, {
    action: { label: 'Undo', onClick: () => void upsertLink(link.fromId, link.toId, { source: link.source, status: link.status, label: link.label }) },
  });
}

export function PersonLinks({ personId }: { personId: string }) {
  const selectPerson = useStore((s) => s.selectPerson);
  const [adding, setAdding] = useState(false);
  // Step 1. One query for the links, one bulkGet for this person and the others (not one get per link).
  const data = useLiveQuery(async () => {
    const links = await db.links.where('fromId').equals(personId).or('toId').equals(personId).toArray();
    const [self, ...others] = await db.people.bulkGet([personId, ...links.map((l) => (l.fromId === personId ? l.toId : l.fromId))]);
    return { self, rows: links.flatMap((link, i) => (others[i] ? [{ link, other: others[i] }] : [])) };
  }, [personId]);
  const self = data?.self;
  const rows = data?.rows;
  const linkedIds = useMemo(() => new Set(rows?.map((r) => r.other.id)), [rows]);

  return (
    <section aria-labelledby="links-heading" className="space-y-2">
      <h3 id="links-heading" className={sectionHeading}>
        Connected to
      </h3>
      {rows?.length ? (
        <ul className="space-y-1">
          {rows.map(({ link, other }) => (
            <li key={link.id} className="flex items-center gap-2 text-sm">
              <button className="shrink-0 truncate text-left underline-offset-2 hover:underline" onClick={() => selectPerson(other.id)}>
                {other.name}
              </button>
              {self && <LinkName key={link.label ?? ''} link={link} fallback={relationshipLabel(link, self, other)} otherName={other.name} />}
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
      {adding && self ? (
        <AddConnection self={self} linkedIds={linkedIds} onDone={() => setAdding(false)} />
      ) : (
        <Button size="xs" variant="outline" onClick={() => setAdding(true)}>
          <Plus /> Add connection
        </Button>
      )}
    </section>
  );
}

/** Step 5. The relationship name, renamable in place. */
function LinkName({ link, fallback, otherName }: { link: Link; fallback: string; otherName: string }) {
  const [draft, setDraft] = useState<string | null>(null);
  if (draft === null)
    return (
      <button
        className={`min-w-0 truncate text-left text-xs text-muted-foreground underline-offset-2 hover:underline ${link.label ? '' : 'italic opacity-75'}`}
        onClick={() => setDraft(link.label ?? '')}
        aria-label={`Relationship with ${otherName}: ${link.label ?? `not named, ${fallback}`}. Rename`}
        title="Rename this connection"
      >
        · {link.label ?? fallback}
      </button>
    );
  const save = () => {
    if (draft !== (link.label ?? '')) void renameLink(link.id, draft);
    setDraft(null);
  };
  return (
    <Input
      autoFocus
      value={draft}
      maxLength={LINK_LABEL_MAX}
      placeholder={fallback}
      aria-label={`Relationship with ${otherName}`}
      className="h-6 min-w-0 flex-1 px-1.5 text-xs"
      onChange={(e) => setDraft(e.target.value)}
      onBlur={save}
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.currentTarget.blur();
        else if (e.key === 'Escape') {
          e.stopPropagation(); // the first Escape cancels the edit; it must not also close the card
          setDraft(null);
        }
      }}
    />
  );
}

/** "Name · Company", made unique, so two people with the same name can both be picked. */
function optionLabels(people: Person[]): Map<string, string> {
  const out = new Map<string, string>();
  for (const p of people) {
    const base = p.company ? `${p.name} · ${p.company}` : p.name;
    let label = base;
    for (let n = 2; out.has(label); n++) label = `${base} (${n})`;
    out.set(label, p.id);
  }
  return out;
}

/** Step 4. Mounted only while open, so the everyone-query doesn't run for every card. */
function AddConnection({ self, linkedIds, onDone }: { self: Person; linkedIds: Set<string>; onDone: () => void }) {
  const listId = useId();
  const people = useLiveQuery(() => db.people.orderBy('name').toArray(), []);
  const options = useMemo(() => optionLabels((people ?? []).filter((p) => p.id !== self.id && !linkedIds.has(p.id))), [people, self.id, linkedIds]);
  const [who, setWho] = useState('');
  const [label, setLabel] = useState('');
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    // An exact pick from the list, or a name typed in full that matches exactly one person.
    const typed = who.trim().toLowerCase();
    const byName = [...options].filter(([text]) => text.toLowerCase() === typed || text.toLowerCase().startsWith(`${typed} · `));
    const id = options.get(who.trim()) ?? (byName.length === 1 ? byName[0]![1] : undefined);
    if (!id) {
      setError(byName.length > 1 ? 'More than one person has that name. Pick one from the list.' : 'Pick someone from the list.');
      return;
    }
    const clean = label.trim().slice(0, LINK_LABEL_MAX);
    await upsertLink(self.id, id, { source: 'user', status: 'accepted', label: clean || undefined });
    toast(`Connected ${self.name} and ${people?.find((p) => p.id === id)?.name ?? 'them'}`);
    onDone();
  };

  return (
    <form
      onSubmit={submit}
      className="space-y-1.5 rounded-md border p-2"
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.stopPropagation(); // close the form, not the card
          onDone();
        }
      }}
    >
      <Input
        autoFocus
        list={listId}
        value={who}
        onChange={(e) => {
          setWho(e.target.value);
          setError('');
        }}
        placeholder="Who? Start typing a name"
        aria-label={`Person to connect with ${self.name}`}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${listId}-err` : undefined}
        className="h-7 text-sm"
      />
      <datalist id={listId}>
        {[...options.keys()].map((text) => (
          <option key={text} value={text} />
        ))}
      </datalist>
      <Input
        value={label}
        maxLength={LINK_LABEL_MAX}
        onChange={(e) => setLabel(e.target.value)}
        placeholder="Relationship (optional), e.g. roommates"
        aria-label="Relationship"
        className="h-7 text-sm"
      />
      {error && (
        <p id={`${listId}-err`} role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
      <div className="flex justify-end gap-1.5">
        <Button type="button" size="xs" variant="ghost" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" size="xs" disabled={!who.trim()}>
          Connect
        </Button>
      </div>
    </form>
  );
}
