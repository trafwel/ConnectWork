/**
 * M3 — Person card · done
 *
 * WHAT THIS ACHIEVES
 *   Everything about one person in one panel, editable in place: name, ring, tag,
 *   company, role, school, email, LinkedIn, extra tags, notes, last contact,
 *   reminders and connections. It is where the map becomes useful day to day.
 *
 * HOW IT FITS
 *   Opens when a node is selected (store.rightPanel = 'person'). Reads the person
 *   with useLiveQuery; writes through db/actions.ts. M8 adds "Draft follow-up".
 *
 * HOW IT WAS BUILT
 *   1. Text fields keep a local draft and save on blur or Enter (no write per
 *      keystroke). The body is keyed by person id so drafts reset when switching people.
 *   2. Extra tags as chips with a datalist of existing tags; × removes one.
 *   3. Notes save on blur. "Log contact today" calls logContact.
 *   4. PersonReminders and PersonLinks are separate components below.
 *   5. Delete person with a confirm step.
 *
 * DONE WHEN
 *   - Edits survive a reload; adding the follow-up tag creates a reminder.
 *
 * Guide: §7.3
 */
import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { toast } from 'sonner';
import { X } from 'lucide-react';
import type { Person } from '@connectwork/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { db } from '@/db/db';
import { deletePerson, logContact, updatePerson } from '@/db/actions';
import { tagColor } from '@/lib/colors';
import { describeLastContact } from '@/lib/people';
import { useStore } from '@/store/useStore';
import { PersonLinks } from './PersonLinks';
import { PersonReminders } from './PersonReminders';
import { RingPicker } from './RingPicker';
import { TagSelect } from './TagSelect';

type TextField = 'name' | 'company' | 'role' | 'school' | 'email' | 'linkedinUrl';
const FIELDS: Array<{ key: TextField; label: string; type?: string }> = [
  { key: 'company', label: 'Company' },
  { key: 'role', label: 'Role' },
  { key: 'school', label: 'School' },
  { key: 'email', label: 'Email', type: 'email' },
  { key: 'linkedinUrl', label: 'LinkedIn', type: 'url' },
];

export function PersonCard({ personId }: { personId: string }) {
  const selectPerson = useStore((s) => s.selectPerson);
  const person = useLiveQuery(() => db.people.get(personId), [personId]);
  if (!person) return null;
  return (
    <aside className="flex h-full w-[26rem] shrink-0 flex-col border-l bg-background" aria-label={`${person.name} details`}>
      <div className="flex items-start justify-between gap-2 border-b p-4">
        <div className="min-w-0 flex-1">
          <TextInput
            key={`name-${person.id}`}
            id="pc-name"
            aria-label="Name"
            className="h-auto border-transparent px-1 text-lg font-semibold shadow-none hover:border-input"
            value={person.name}
            onSave={(v) => v.trim() && updatePerson(person.id, { name: v.trim() })}
          />
          <p className="px-1 text-sm text-muted-foreground">
            {[person.role, person.company].filter(Boolean).join(' · ') || 'No role or company yet'}
          </p>
        </div>
        <Button variant="ghost" size="icon" aria-label="Close" onClick={() => selectPerson(null)}>
          <X />
        </Button>
      </div>
      <div className="flex-1 space-y-5 overflow-y-auto p-4">
        <CardBody key={person.id} person={person} />
      </div>
    </aside>
  );
}

function CardBody({ person }: { person: Person }) {
  const tags = useLiveQuery(() => db.tags.toArray());
  const selectPerson = useStore((s) => s.selectPerson);
  const [newTag, setNewTag] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const extraTags = person.tags.filter((t) => t !== person.primaryTag);

  return (
    <>
      <section className="grid grid-cols-[6rem_1fr] items-center gap-x-3 gap-y-2 text-sm">
        <Label>Ring</Label>
        <RingPicker value={person.ring} onChange={(ring) => updatePerson(person.id, { ring })} />
        <Label htmlFor="pc-tag">Tag</Label>
        <div className="flex items-center gap-2">
          <span className="inline-block size-2.5 rounded-full" style={{ background: tagColor(tags, person.primaryTag) }} aria-hidden="true" />
          <TagSelect id="pc-tag" value={person.primaryTag} onChange={(primaryTag) => updatePerson(person.id, { primaryTag })} />
        </div>
        {FIELDS.map((f) => (
          <FieldRow key={f.key} person={person} field={f.key} label={f.label} type={f.type} />
        ))}
      </section>

      <section aria-labelledby="tags-heading" className="space-y-2">
        <h3 id="tags-heading" className="text-sm font-medium">
          More tags
        </h3>
        <div className="flex flex-wrap items-center gap-1.5">
          {extraTags.map((t) => (
            <span key={t} className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs">
              <span className="inline-block size-2 rounded-full" style={{ background: tagColor(tags, t) }} aria-hidden="true" />
              {t}
              <button
                className="ml-0.5 text-muted-foreground hover:text-foreground"
                aria-label={`Remove tag ${t}`}
                onClick={() => updatePerson(person.id, { tags: person.tags.filter((x) => x !== t) })}
              >
                ×
              </button>
            </span>
          ))}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const t = newTag.trim();
              if (t && !person.tags.includes(t)) updatePerson(person.id, { tags: [...person.tags, t] });
              setNewTag('');
            }}
          >
            <Input
              list="tag-names"
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              placeholder="Add tag"
              aria-label="Add tag"
              className="h-7 w-28 text-xs"
            />
            <datalist id="tag-names">
              {tags?.map((t) => <option key={t.name} value={t.name} />)}
            </datalist>
          </form>
        </div>
      </section>

      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium">Last contact</h3>
          <Button
            variant="outline"
            size="xs"
            onClick={async () => {
              await logContact(person.id);
              toast.success(`Logged contact with ${person.name}`);
            }}
          >
            Log contact today
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">{describeLastContact(person)}</p>
      </section>

      <section className="space-y-1.5">
        <Label htmlFor="pc-notes" className="text-sm font-medium">
          Notes
        </Label>
        <NotesField person={person} />
      </section>

      <PersonReminders personId={person.id} />
      <PersonLinks personId={person.id} />

      <section className="border-t pt-4">
        {confirmDelete ? (
          <div className="flex items-center gap-2 text-sm">
            <span>Delete {person.name}?</span>
            <Button
              variant="destructive"
              size="sm"
              onClick={async () => {
                await deletePerson(person.id);
                selectPerson(null);
                toast.success(`Deleted ${person.name}`);
              }}
            >
              Delete
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(false)}>
              Cancel
            </Button>
          </div>
        ) : (
          <Button variant="ghost" size="sm" className="text-destructive" onClick={() => setConfirmDelete(true)}>
            Delete person
          </Button>
        )}
      </section>
    </>
  );
}

function FieldRow({ person, field, label, type }: { person: Person; field: TextField; label: string; type?: string }) {
  const id = `pc-${field}`;
  return (
    <>
      <Label htmlFor={id}>{label}</Label>
      <TextInput
        id={id}
        type={type}
        className="h-8"
        value={person[field] ?? ''}
        onSave={(v) => updatePerson(person.id, { [field]: v.trim() || undefined })}
      />
    </>
  );
}

/** Local draft; saves on blur or Enter so typing doesn't write on every keystroke. */
function TextInput({
  value,
  onSave,
  ...rest
}: { value: string; onSave: (v: string) => unknown } & Omit<React.ComponentProps<typeof Input>, 'value' | 'onChange'>) {
  const [draft, setDraft] = useState(value);
  return (
    <Input
      {...rest}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => draft !== value && onSave(draft)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
      }}
    />
  );
}

function NotesField({ person }: { person: Person }) {
  const [draft, setDraft] = useState(person.notes ?? '');
  return (
    <Textarea
      id="pc-notes"
      rows={4}
      value={draft}
      placeholder="How you met, what you talked about…"
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => draft !== (person.notes ?? '') && updatePerson(person.id, { notes: draft || undefined })}
    />
  );
}
