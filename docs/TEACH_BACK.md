# Connectwork — Teach-back questions

Rule 4 in `CLAUDE.md`: after every milestone Claude writes 2–4 short questions here. The team answers them (in this file or in chat) before relying on that milestone's concepts. Claude marks a question ✅ once the answer shows the concept landed, or re-explains it differently if not.

**Status:** all open (as of Oct 17).

## M1
**Browser database, seeding, Settings**

1. In M3, someone writes a new person with `indexedDB.open(...)` directly instead of `db.people.add(...)`. What will the user see, and why?
2. Why does "Delete everything" leave `seeded` set to true? What would happen on the next reload if it didn't?
3. In `resetDemoData`, why is the demo file loaded *before* `db.transaction(...)` and not inside it?
4. The seed says John was last contacted "210 days ago". Why store that number instead of the date `2026-03-21`?

## M2
**Ring map**

1. Why does the layout run all of its ticks at once, in a layout effect, instead of animating tick by tick? What two problems does that solve?
2. Editing someone's notes doesn't move anyone on the map, but changing their ring does. What makes the difference in the code?
3. Why are people outside a filter *dimmed* instead of removed from the map?
4. Why does `PersonNode` receive a "snapped" zoom (1, 1.3 or 2.2) instead of the real zoom number?

## M3
**`actions.ts`, person card, quick add**

1. Why does no component call `db.people.put(...)` directly, even though it would be one line shorter?
2. What went wrong when a field copied its value into local state *once*, and how does "draft only while typing" fix it?
3. Why is `deletePerson` one transaction across four tables? What could a user see if it weren't?
4. Why are links stored with the smaller id first?

## M4
**CSV import**

1. John's role is `"CS student, former Microsoft intern"`. Why can't we just split each line on commas?
2. When an imported row matches someone you already have, why do we only fill *empty* fields?
3. Why does name + company only count as a match when *both* sides have a company? What's the trade-off?
4. The preview already worked out the import plan. Why is it computed again when you click Import?

## Open-issues step (after M4)
**Undo, backup validation, contrast**

1. Undo for "Delete person" restores a snapshot. Why must the snapshot include the links, reminders and history, and why are some links skipped when restoring?
2. A backup with `ring: 99` is refused, but one with `linkedinUrl: "javascript:…"` is accepted with that link removed. Why treat them differently?
3. Why is `new Date('2026-10-24')` the wrong way to show a date to someone in Seattle?

## M5
**Ask Connectwork**

1. Why can't the browser call Gemini directly with the API key, even though that would save a server?
2. The model returned an id that isn't in the data. Where does it get dropped, and why there rather than in the prompt?
3. On the first live run, "Who have I lost touch with?" named the wrong people. What did we change so the highlights are right no matter what the model says?
4. Why does the browser send today's date in a header instead of in the request body?

## Open-issues step (after M5)
**Cancelling questions**

1. You ask "Microsoft?", then quickly "Apple?". The Microsoft reply arrives *after* the Apple one. What stops it from replacing the Apple answer?
2. After you cancel, does Gemini stop working on the question? What does that mean for our free-tier quota?

## M6
**Step R, Sort with AI, hidden links, review sheet**

1. The prompt already says "never suggest ring 1 for imported contacts". Why do we *also* turn ring 1 into ring 2 in code?
2. Hidden links appear as dashed lines before you accept them. What does Dismiss have to do, and why?
3. Step R rewrote how `/query` works. How do we know it still behaves exactly the same?
4. Accepting a sort keeps your own tags but drops "LinkedIn". Why both?

## Step S: style switching
**Styles and modes**

1. Switching to Atlas restyles the whole map without React re-rendering it. What makes that possible?
2. Why is there a small script inside `index.html` instead of only doing this in React?
3. Why is the style choice saved in `localStorage` and not in IndexedDB with the rest of the data?

## Open-issues step (after M6)
**Sector moves and highlights**

1. After a sort, why didn't the re-tagged people move to the Work sector at first, and what makes them move now?
2. Hovering a review row used to wipe your Ask Connectwork highlights. What does the row remember, and when does it give it back?
