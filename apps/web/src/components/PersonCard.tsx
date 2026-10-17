import { useLiveQuery } from 'dexie-react-hooks';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { db } from '@/db/db';
import { tagColor } from '@/lib/colors';
import { describeLastContact } from '@/lib/people';
import { useStore } from '@/store/useStore';

export function PersonCard({ personId }: { personId: string }) {
  const selectPerson = useStore((s) => s.selectPerson);
  const person = useLiveQuery(() => db.people.get(personId), [personId]);
  const tags = useLiveQuery(() => db.tags.toArray());

  if (!person) return null;
  return (
    <aside className="flex h-full w-96 shrink-0 flex-col border-l bg-background" aria-label={`${person.name} details`}>
      <div className="flex items-start justify-between gap-2 border-b p-4">
        <div>
          <h2 className="text-lg font-semibold">{person.name}</h2>
          <p className="text-sm text-muted-foreground">
            {[person.role, person.company].filter(Boolean).join(' · ') || 'No role or company yet'}
          </p>
        </div>
        <Button variant="ghost" size="icon" aria-label="Close" onClick={() => selectPerson(null)}>
          <X />
        </Button>
      </div>
      <dl className="grid grid-cols-[7rem_1fr] gap-x-3 gap-y-2 p-4 text-sm">
        <dt className="text-muted-foreground">Ring</dt>
        <dd>{person.ring}</dd>
        <dt className="text-muted-foreground">Tag</dt>
        <dd className="flex items-center gap-1.5">
          <span className="inline-block size-2.5 rounded-full" style={{ background: tagColor(tags, person.primaryTag) }} aria-hidden="true" />
          {person.primaryTag}
        </dd>
        {person.school && (
          <>
            <dt className="text-muted-foreground">School</dt>
            <dd>{person.school}</dd>
          </>
        )}
        <dt className="text-muted-foreground">Last contact</dt>
        <dd>{describeLastContact(person)}</dd>
      </dl>
      {person.notes && <p className="px-4 text-sm whitespace-pre-wrap">{person.notes}</p>}
    </aside>
  );
}
