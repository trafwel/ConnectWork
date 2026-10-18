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

## M7
**Flags, filter tabs, calendar export**

1. Why does the pulse animation live on an *inner* `<g>` instead of the node's own `<g>`?
2. An all-day calendar event on Oct 18 has its end date set to Oct 19. Why?
3. The `ics` library's tests passed, yet we found a bug in its output. What was it, and how did we find it?
4. Why does clicking a filter tab clear the AI's highlights?

## M8
**Weekly review**

1. Why does the app compute the candidates in code instead of letting the AI look at everyone?
2. Approving a follow-up reschedules its existing reminder. What would go wrong if it created a new one?
3. Why does approving an action never change anyone's "last contact"?
4. "Draft a message" is the only AI call that sends notes. Why is that acceptable there but not in Ask Connectwork?

## M9
**Snap to add**

1. Why do we shrink photos in the browser before sending them, and what privacy bonus does redrawing on a canvas give?
2. Why may the demo roster be cached but a real photo never?
3. The live test first failed with "did not respond", but the real reason was the free-tier quota. What changed so the user now sees the true reason?
4. Why did the fallback model reject the extract schema, and why is it safe to leave that cap out of what we send Gemini?

## Fix step 1: map labels
**Map labels, click focus, named connections**

1. Names used to live inside the zoomed group. Why did that make them both overlap and grow with zoom, and what does drawing them in "screen space" change?
2. `placeLabels` is greedy: most important label first, first free spot wins. Who goes first, and why is it fine that some names get skipped?
3. Why do labels glide when the layout changes but snap instantly while you zoom or pan?
4. A link with no name still shows something on the map. Where does "both at Microsoft" come from, and why compute it instead of storing it?

## Fix step 2: map features
**Ripple reminders, "Move people" edit mode**

1. Why is Flag vs Ripple an attribute on `<html>` plus CSS, instead of a prop passed to every node?
2. At first, dragging a person also panned the map. Why did re-ordering the node on the press cause that, and why was React's `stopPropagation` no help?
3. `ringForDistance` puts the boundary halfway between two rings. What would feel wrong if the boundary were the ring line itself?
4. Escape can mean three things now. In what order, and how does a drag get to handle it before App does?

## M10
**Drift and the list view**

1. Drift is computed once in App and handed to the map, the list and the Drifting tab. What could go wrong if each of them called `driftLevel` on its own?
2. Why doesn't a LinkedIn "connected on" date count as contact, and what makes that person start drifting normally?
3. Your drift limits are sent to the AI only when they differ from 90 / 180. Why does leaving them out of ordinary requests matter (think about the demo cache)?
4. In the list view, pressing Enter on a name moves keyboard focus into the card, and Escape brings it back. Who is that for, and what was the experience before?

## M11
**Google Calendar and meeting prep**

1. Why is the Google token kept only in memory (not IndexedDB or localStorage), and what does the user notice because of that?
2. Our server never sees the calendar. Trace what happens when you open a meeting: what goes to Google, what goes to our server, and what reaches Gemini?
3. On the free tier, why does a real meeting get no AI brief while a sample meeting does?
4. Vite wasn't reading our `.env` at all. Why was pointing it at the repo root safe, even though that file also holds `GEMINI_API_KEY`?

## M12
**Demo hardening**

1. A recorded answer is found by a hash of the request. Why must the browser parse the request with the zod schema before hashing it, and what would break if it didn't?
2. Why must the recording be made on the morning we present, in the same order as the demo?
3. When the server is stopped, the browser doesn't get a network error. What does it get, and how does the app still find the saved answer?
4. Why is the recording loaded as a separate chunk instead of being imported directly?

## M13
**Deploy config**

1. Our Content-Security-Policy allows one inline script by its hash. What happens on the live site if someone edits that script in `index.html` and forgets the hash, and what catches it before then?
2. Why does the API listen on 127.0.0.1 only, and how does that make `TRUST_PROXY=1` safe?
3. The service reads `.env` through systemd's `EnvironmentFile`. Which two problems did that cause or solve (think: file permissions, and inline comments)?
4. What does `pnpm preview:prod` check that `pnpm dev` can't?

