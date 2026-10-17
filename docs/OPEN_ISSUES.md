# Connectwork — Open issues

Every item a milestone self-review ([REVIEWS.md](REVIEWS.md)) left unresolved, in one list. IDs point back to the review row (e.g. **M2-O1** = review M2, row O1). Each item is in one group:

- **Fix now:** can be done without another milestone or a team decision. Claude fixes these in an "open issues" step after the milestone.
- **Waits for a milestone:** belongs to the work of a later milestone, which picks it up.
- **Team decision:** needs your call. Claude suggests a default.
- **Won't fix (for now):** acceptable as is, with the reason.

Resolved items move to the table at the bottom, with what changed.

## Fix now
| ID | Issue | Plan |
| --- | --- | --- |
| M1-I4 | If the first seed fails, `ensureSeeded` stays rejected until a reload. | Forget the failed promise so the next call retries. |
| M1-S2 | Import checks only the shape of each row (an object with a string key), not its fields. | Zod schemas for stored rows (`Person`, `Link`, `Reminder`, `Tag`, `ContactLog`, `Meeting`, `meta`); refuse the file if any row fails. |
| M1-S5 | Exported backups contain notes in plain text, with no warning. | One line in Settings: "The backup is not encrypted. Keep it somewhere private." |
| M2-O1 | `readableOn` is a stub (always white), so initials on School, Clubs and intro fail 4.5:1 contrast. | Implement `contrastRatio` and `readableOn` (pure, already specified in `lib/colors.ts`); unskip their tests. |
| M3-E4 | Every edit gives *all* people new object identities, so every `PersonNode` re-renders. | A custom `memo` comparison on the fields a node actually draws. |
| M3-O5 | Delete person has no undo. | Snapshot the person, links, reminders and logs before deleting; the toast's Undo restores them in one transaction. |
| M3-O7 | Dates show as ISO (`2026-10-24`). | A `formatDate` helper ("Sat, Oct 24") for display; keep ISO in storage and in the date input. |
| M4-O3 | An import of 114 people has no undo. | "Undo" on the success toast: delete the new ids and clear the fields the import filled, in one transaction. |

## Waits for a milestone
| ID | Issue | Milestone |
| --- | --- | --- |
| M1-S4 | `javascript:` URLs in `linkedinUrl` or `email` would run if ever rendered as links. | Any milestone that renders them as `<a href>` must allow only `https:`/`mailto:` (note in `PersonCard.tsx`). The CSV import path is closed (M4-S1); the backup import path closes with M1-S2. |
| M2-E5 | Main bundle is over Vite's 500 KB warning (d3 is on the first screen). | M14 deploy: measure, and keep snap/calendar code behind `import()`. |
| M2-O5 | Filter and highlight have no UI yet. | M5 (agent highlights), M7 (filter tabs). |
| M3-S2 | Text from imports bypasses the UI's `maxLength`, and goes into AI summaries. | CSV path closed (M4-S2). Still M5: cap lengths in the server-side zod schemas (and when building the summary). |
| M4-O4 | Imported "connected on" dates become last contact, so most imports look "drifting". | M10: treat imported people with no logged contact gently. |
| M4-I4 | Import drop zone not yet checked with a real keyboard (the pane can't open a native file picker). | Team: one manual check (Tab to the drop zone, press Space/Enter). |

## Team decision
| ID | Question | Claude's suggested default |
| --- | --- | --- |
| M1-O5 | Import replaces everything without confirming. Should it ask first, or auto-export a backup? | A two-step confirm like Delete ("Replace all your data with this backup?"). It's consistent, needs no extra download, and is easy to change. *Applied in the fix step unless you say otherwise.* |

## Won't fix (for now)
| ID | Issue | Why |
| --- | --- | --- |
| M1-E3 | Export builds the whole backup in memory. | A few thousand people is well under 10 MB. |
| M2-E6 | Layout blocks the main thread for about 86 ms at 154 people. | Fine at hackathon scale; move to a Web Worker only above about 400 people. |
| M2-O2 | Keyboard Tab order goes ring 3 → 1 (it follows paint order). | Fixing it needs a roving focus model for the SVG. The M10 list view is the keyboard-first path. |
| M2-O3 | Neighbour names can overlap when someone is selected. | Cosmetic; needs a label-placement pass. Revisit in theme step T if time allows. |
| M2-O4 | 114 unsorted imports form a thick wedge slightly outside ring 3. | M6 "Sort with AI" spreads them; zoom and pan reach them meanwhile. |
| M3-O6 | Removing the follow-up tag keeps its reminder. | By design: the reminder is a real task. |
| M4-O1 | The same person with no URL, email or company in two different files is imported twice. | The price of not merging namesakes; the user can delete one. |
| M4-O5 | A generic CSV ring outside 1–3 silently becomes ring 3. | The preview shows who lands; easy to move later. |

## Resolved
| ID | Issue | How |
| --- | --- | --- |
| M2-I4 | Escape only worked with focus inside the map. | M3: global `useHotkey('Escape')`. |
| M2-O6 | Empty state couldn't mention adding people. | M3: "Press N to add someone…" (M4 adds Import). |
| M3-I3 | `actions.ts` writes had no unit tests. | M3: `fake-indexeddb` plus 18 tests (team approved). |
