/**
 * M3 — Person card · Owner: Person A · ~1.5 h
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
 *      LOCAL draft (useState) and saves on blur or Enter — not on every keystroke:
 *        onBlur={() => draft !== value && updatePerson(id, { [field]: draft.trim() || undefined })}
 *        onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
 *   4. Ring: <RingPicker>; Tag: color dot + <TagSelect>; both save immediately.
 *   5. More tags: chips for tags other than the primary, each with a "×" button
 *      (aria-label "Remove tag X"); an "Add tag" input with a <datalist> of existing tag names.
 *   6. Last contact: describeLastContact(person) + a "Log contact today" button (logContact + toast).
 *   7. Notes: <Textarea> with a local draft, saved on blur.
 *   8. <PersonReminders personId /> and <PersonLinks personId /> sections.
 *   9. "Delete person" → inline confirm ("Delete Abbey Chen?" Delete / Cancel) →
 *      deletePerson, selectPerson(null), toast.
 *
 * DONE WHEN
 *   - Edits survive a reload; the follow-up tag creates a reminder; delete removes the node.
 *
 * Guide: §7.3
 */

export function PersonCard(_props: { personId: string }) {
  // TODO(M3) steps 1–9
  return null;
}
