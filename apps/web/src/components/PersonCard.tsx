/**
 * M3 — Person card · done (M7 added Add to calendar, M8 Draft a message)
 *
 * WHAT THIS ACHIEVES
 *   Everything about one person in one panel, editable in place: name, ring, tag,
 *   company, role, school, email, LinkedIn, extra tags, notes, last contact,
 *   reminders and connections. It's where the map becomes useful day to day.
 *
 * HOW IT FITS
 *   Shown on the right when a node is selected (store.rightPanel === 'person'). Reads the
 *   person with useLiveQuery(() => db.people.get(personId), [personId]); every write goes
 *   through db/actions.ts. M7 adds "Add to calendar"; M8 adds "Draft follow-up".
 *
 * STEPS
 *   1. <aside className="flex h-full w-[26rem] shrink-0 flex-col border-l bg-background"
 *      aria-label={`${name} details`}>. Header: the name as an inline <Input> (transparent
 *      border until hover) + "Role · Company" + a Close button (selectPerson(null)).
 *   2. Put the body in a child component with key={person.id}, so local drafts reset when
 *      you switch people.
 *   3. Text fields (Company, Role, School, Email type=email, LinkedIn type=url): each keeps a
 *      LOCAL draft only WHILE EDITING (M3 review: a draft copied once could later overwrite a
 *      newer value from an import or AI sort) and saves on blur or Enter — not on every keystroke:
 *        onBlur={() => draft !== value && updatePerson(id, { [field]: draft.trim() || undefined })}
 *        onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
 *      SECURITY (M1 review): if you ever render email/LinkedIn as a clickable <a href>, allow
 *      only https:/mailto: — an imported backup or CSV can contain "javascript:…" URLs, and
 *      React escapes text but does NOT block javascript: in href.
 *   4. Ring: <RingPicker>; Tag: color dot + <TagSelect>; both save immediately.
 *   5. More tags: chips for tags other than the primary, each with a "×" button
 *      (aria-label "Remove tag X"); an "Add tag" input with a <datalist> of existing tag names.
 *   6. Last contact: describeLastContact(person) + a "Log contact today" button (logContact + toast).
 *   7. Notes: <Textarea> with a local draft, saved on blur.
 *   8. <PersonReminders personId /> and <PersonLinks personId /> sections.
 *   9. "Delete person" → inline confirm ("Delete Abbey Chen?" Delete / Cancel) →
 *      deletePerson, selectPerson(null), toast with Undo (restorePerson; open-issues step).
 *
 * DONE WHEN
 *   - Edits survive a reload; the follow-up tag creates a reminder; delete removes the node.
 *
 * Guide: §7.3
 */

import { useState, type ComponentProps } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Copy, Sparkles, X } from 'lucide-react';
import { toast } from 'sonner';
import type { Person } from '@connectwork/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { deletePerson, logContact, restorePerson, updatePerson } from '@/db/actions';
import { db } from '@/db/db';
import { DraftResponse } from '@connectwork/shared';
import { aiPost } from '@/lib/api';
import { safeColor, tagColor } from '@/lib/colors';
import { driftLevel } from '@/lib/drift';
import { describeLastContact } from '@/lib/people';
import { useDriftThresholds } from '@/lib/useDriftThresholds';
import { sectionHeading } from '@/lib/utils';
import { useStore } from '@/store/useStore';
import { PersonLinks } from './PersonLinks';
import { PhotoField } from './PhotoField';
import { PersonReminders } from './PersonReminders';
import { RingPicker } from './RingPicker';
import { TagSelect } from './TagSelect';

type TextField = 'company' | 'role' | 'school' | 'email' | 'linkedinUrl';
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
    // Step 1
    // M10: id + tabIndex -1 so the list view can move keyboard focus here when it opens a card.
    <aside
      id="person-card"
      tabIndex={-1}
      className="flex h-full w-[26rem] shrink-0 flex-col border-l bg-background outline-none"
      aria-label={`${person.name} details`}
    >
      <div className="flex items-start justify-between gap-2 border-b p-4">
        <div className="min-w-0 flex-1">
          <EditableText
            aria-label="Name"
            className="h-auto border-transparent px-1 text-lg font-semibold shadow-none hover:border-input"
            value={person.name}
            maxLength={120}
            onSave={(name) => updatePerson(person.id, { name })}
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
        {/* Step 2. key: local state (tag input, delete confirm) resets when you switch people */}
        <CardBody key={person.id} person={person} />
      </div>
    </aside>
  );
}

function CardBody({ person }: { person: Person }) {
  const tags = useLiveQuery(() => db.tags.toArray(), []);
  const thresholds = useDriftThresholds();
  const drifting = person ? driftLevel(person, new Date(), thresholds) > 0 : false;
  const selectPerson = useStore((s) => s.selectPerson);
  const [newTag, setNewTag] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const extraTags = person.tags.filter((t) => t !== person.primaryTag);

  return (
    <>
      {/* Steps 3–4 */}
      <section className="grid grid-cols-[6rem_1fr] items-center gap-x-3 gap-y-2 text-sm">
        <Label>Photo</Label>
        <PhotoField person={person} color={tagColor(tags, person.primaryTag)} />
        <Label>Ring</Label>
        <RingPicker value={person.ring} onChange={(ring) => updatePerson(person.id, { ring })} />
        <Label htmlFor="pc-tag">Tag</Label>
        <div className="flex items-center gap-2">
          <span className="inline-block size-2.5 rounded-full" style={{ background: tagColor(tags, person.primaryTag) }} aria-hidden="true" />
          <TagSelect id="pc-tag" value={person.primaryTag} onChange={(primaryTag) => updatePerson(person.id, { primaryTag })} />
        </div>
        {FIELDS.map((f) => (
          <FieldRow key={f.key} label={f.label} htmlFor={`pc-${f.key}`}>
            <EditableText
              id={`pc-${f.key}`}
              type={f.type}
              className="h-8"
              maxLength={300}
              value={person[f.key] ?? ''}
              onSave={(v) => updatePerson(person.id, { [f.key]: v.trim() || undefined })}
            />
          </FieldRow>
        ))}
      </section>

      {/* Step 5 */}
      <section aria-labelledby="tags-heading" className="space-y-2">
        <h3 id="tags-heading" className={sectionHeading}>
          More tags
        </h3>
        <div className="flex flex-wrap items-center gap-1.5">
          {extraTags.map((t) => (
            <span key={t} className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs">
              <span className="inline-block size-2 rounded-full" style={{ background: safeColor(tagColor(tags, t)) }} aria-hidden="true" />
              {t}
              <button
                type="button"
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
              if (t && !person.tags.includes(t)) void updatePerson(person.id, { tags: [...person.tags, t] });
              setNewTag('');
            }}
          >
            <Input
              list="tag-names"
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              placeholder="Add tag"
              aria-label="Add tag"
              maxLength={40}
              className="h-7 w-28 text-xs"
            />
            <datalist id="tag-names">
              {tags?.map((t) => (
                <option key={t.name} value={t.name} />
              ))}
            </datalist>
          </form>
        </div>
      </section>

      {/* Step 6 */}
      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className={sectionHeading}>Last contact</h3>
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
        {/* M10 step 6: the word "drifting" carries the meaning; the color only adds to it. */}
        <p className={`text-sm ${drifting ? 'text-destructive' : 'text-muted-foreground'}`}>
          {describeLastContact(person)}
          {drifting && ' · drifting'}
        </p>
      </section>

      {/* Step 7 */}
      <section className="space-y-1.5">
        <Label htmlFor="pc-notes" className={sectionHeading}>
          Notes
        </Label>
        <EditableText
          multiline
          id="pc-notes"
          rows={4}
          maxLength={5000}
          placeholder="How you met, what you talked about…"
          value={person.notes ?? ''}
          onSave={(notes) => updatePerson(person.id, { notes: notes || undefined })}
        />
      </section>

      {/* M8 */}
      <DraftMessage person={person} />

      {/* Step 8 */}
      <PersonReminders personId={person.id} />
      <PersonLinks personId={person.id} />

      {/* Step 9. Two clicks: a person takes their links, reminders and history with them. */}
      <section className="border-t pt-4">
        {confirmDelete ? (
          <div className="flex items-center gap-2 text-sm">
            <span>Delete {person.name}?</span>
            <Button
              variant="destructive"
              size="sm"
              onClick={async () => {
                const snapshot = await deletePerson(person.id);
                selectPerson(null);
                // Undo restores the person with their links, reminders and history (M3-O5).
                toast.success(`Deleted ${person.name}`, {
                  action: snapshot ? { label: 'Undo', onClick: () => void restorePerson(snapshot).then(() => selectPerson(snapshot.person.id)) } : undefined,
                });
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

/**
 * M8. "Draft a message": the ONE AI call that sends a person's notes, and only for this person,
 * only when the user clicks (free tier: demo data only). The draft is editable and never sent.
 */
function DraftMessage({ person }: { person: Person }) {
  const [draft, setDraft] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const make = async () => {
    setBusy(true);
    const links = await db.links.where('fromId').equals(person.id).or('toId').equals(person.id).filter((l) => l.status === 'accepted').toArray();
    const others = await db.people.bulkGet(links.map((l) => (l.fromId === person.id ? l.toId : l.fromId)));
    const res = await aiPost(
      '/draft',
      {
        person: {
          id: person.id,
          name: person.name.slice(0, 120),
          company: person.company?.slice(0, 300),
          role: person.role?.slice(0, 300),
          school: person.school?.slice(0, 300),
          metAt: person.metAt,
          notes: person.notes?.slice(0, 4000),
          lastContact: person.lastContact,
        },
        sharedConnections: others.flatMap((o) => (o ? [o.name] : [])).slice(0, 20),
      },
      DraftResponse,
    );
    setBusy(false);
    if (res.ok) setDraft(res.data.message);
    else toast.error(res.message);
  };

  return (
    <section className="space-y-2" aria-labelledby="draft-heading">
      <div className="flex items-center justify-between">
        <h3 id="draft-heading" className={sectionHeading}>
          Message
        </h3>
        <Button variant="outline" size="xs" disabled={busy} onClick={() => void make()}>
          <Sparkles /> {busy ? 'Drafting…' : draft === null ? 'Draft a message' : 'Draft again'}
        </Button>
      </div>
      {draft !== null && (
        <>
          <Textarea aria-label={`Draft message to ${person.name}`} rows={4} maxLength={800} value={draft} onChange={(e) => setDraft(e.target.value)} />
          <Button
            variant="outline"
            size="xs"
            onClick={() =>
              void navigator.clipboard.writeText(draft).then(
                () => toast.success('Draft copied'),
                () => toast.error('Could not copy. Select the text and copy it yourself.'),
              )
            }
          >
            <Copy /> Copy
          </Button>
        </>
      )}
    </section>
  );
}

function FieldRow({ label, htmlFor, children }: { label: string; htmlFor: string; children: React.ReactNode }) {
  return (
    <>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </>
  );
}

type EditableTextProps = { value: string; onSave: (v: string) => unknown } & (
  | ({ multiline?: false } & Omit<ComponentProps<typeof Input>, 'value' | 'onChange'>)
  | ({ multiline: true } & Omit<ComponentProps<typeof Textarea>, 'value' | 'onChange'>)
);

/**
 * Shows the stored value; keeps a draft only while you type, and saves it on blur
 * (or Enter for single-line fields). A draft that lived longer could overwrite a newer
 * value written elsewhere (import, AI sort) the next time the field loses focus.
 */
function EditableText({ value, onSave, multiline, ...rest }: EditableTextProps) {
  const [draft, setDraft] = useState<string | null>(null);
  const commit = () => {
    if (draft !== null && draft !== value) void onSave(draft);
    setDraft(null);
  };
  const shared = {
    value: draft ?? value,
    onBlur: commit,
    onKeyDown: (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      if (e.key === 'Escape' && draft !== null) {
        e.stopPropagation(); // first Escape cancels the edit; it must not also close the card
        setDraft(null);
      } else if (e.key === 'Enter' && !multiline) e.currentTarget.blur();
    },
  };
  return multiline ? (
    <Textarea
      {...(rest as Omit<ComponentProps<typeof Textarea>, 'value' | 'onChange'>)}
      {...shared}
      onChange={(e) => setDraft(e.target.value)}
    />
  ) : (
    <Input {...(rest as Omit<ComponentProps<typeof Input>, 'value' | 'onChange'>)} {...shared} onChange={(e) => setDraft(e.target.value)} />
  );
}
