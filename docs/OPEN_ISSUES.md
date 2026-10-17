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
| — | Nothing open. The post-M6 step fixed all three (see Resolved). | — |

## Waits for a milestone
| ID | Issue | Milestone |
| --- | --- | --- |
| M1-S4 | `javascript:` URLs in `linkedinUrl` or `email` would run if ever rendered as links. | Both import paths are now closed (CSV: M4-S1; backup: the M1-S2 row schemas drop unsafe links). Still: any milestone that renders them as `<a href>` must allow only `https:`/`mailto:`, because users can *type* anything into the card. |
| M2-E5 | Main bundle is over Vite's 500 KB warning: 648 KB, because d3 is on the first screen and zod (about 77 KB) arrived with backup validation. | M14 deploy: measure. zod stays in the main bundle (M5 must validate AI replies in the browser); keep snap/calendar behind `import()` like the import dialog. |
| M2-O5 | Filter tabs have no UI yet (highlights now come from Ask Connectwork, M5). | M7 (filter tabs). |
| M5-I5 | "Lost touch" thresholds live in the prompt and in `lib/drift.ts`. | M10: if Settings makes them editable, send the current values with each query. |
| S-S1 | The no-flash appearance script in `index.html` is inline; a strict CSP would block it. | M13: allow it by hash in the CSP (or move it to a tiny external file). |
| M5-S9 | The deployed server has no login: anyone who can reach it can spend our Gemini quota (30/min per IP). | M13/M14: serve web and API from one origin behind Caddy (`TRUST_PROXY=1`), and consider a shared demo passcode or lower per-IP limits. |
| PX-I1 | `PersonNode`'s custom memo comparison lists the fields a node draws. | M7 (flags) and M10 (drift): add any new drawn field or prop to `sameNode`, or that node won't update. |
| M4-O4 | Imported "connected on" dates become last contact, so most imports look "drifting". | M10: treat imported people with no logged contact gently. |

## Team decision
| ID | Question | Claude's suggested default |
| --- | --- | --- |
| M4-I4 | Import drop zone not yet checked with a real keyboard. | Tab to the drop zone and press Space/Enter once. |
| M1-O5 | Import replaces everything without confirming. Should it ask first, or auto-export a backup? | A two-step confirm like Delete ("Replace all your data with this backup?"). It's consistent, needs no extra download, and is easy to change. *Applied in the fix step unless you say otherwise.* |

## Won't fix (for now)
| ID | Issue | Why |
| --- | --- | --- |
| M1-E3 | Export builds the whole backup in memory. | A few thousand people is well under 10 MB. |
| S-O1 | Atlas polish not done: contour circles, crosshair, uppercase ring labels, bundled IBM Plex, darker tag palette. | Theme step T. |
| M6-O2 | No undo after accepting a sort. | The review sheet is the confirmation; each person can be changed on their card. |
| P5-O1 | Cancelling a question stops the *browser* waiting, but the server still finishes the Gemini call (quota is spent). | Passing the client's abort through to Gemini (`c.req.raw.signal` → SDK `abortSignal`) is possible; worth it only if quota gets tight. |
| M5-E2 | Every question sends the whole network (about 10k tokens at 154 people). | Fine on the free tier; the model needs the data. Trim only if cost matters. |
| M5-S5 | A crafted contact name could make the answer *sentence* misleading (prompt injection). | Ids are filtered in code and the answer is plain text; the residual risk is wording only. |
| M5-O5 | On a narrow window the corner answer card can overlap the outer ring. | Desktop-first demo. |
| M2-E6 | Layout blocks the main thread for about 86 ms at 154 people. | Fine at hackathon scale; move to a Web Worker only above about 400 people. |
| M2-O2 | Keyboard Tab order goes ring 3 → 1 (it follows paint order). | Fixing it needs a roving focus model for the SVG. The M10 list view is the keyboard-first path. |
| M2-O3 | Neighbour names can overlap when someone is selected. | Cosmetic; needs a label-placement pass. Revisit in theme step T if time allows. |
| M2-O4 | 114 unsorted imports form a thick wedge slightly outside ring 3. | M6 "Sort with AI" spreads them; zoom and pan reach them meanwhile. |
| M3-O6 | Removing the follow-up tag keeps its reminder. | By design: the reminder is a real task. |
| M4-O1 | The same person with no URL, email or company in two different files is imported twice. | The price of not merging namesakes; the user can delete one. |
| M4-O5 | A generic CSV ring outside 1–3 silently becomes ring 3. | The preview shows who lands; easy to move later. |
| PX-O1 | Undo of an import keeps any *new tags* it created. | Harmless (an unused tag), and removing tags could hit ones the user started using. |
| PX-I2 | The `PersonNode` memo fix wasn't measured at runtime: re-renders can't be observed without React DevTools. | It's a pure comparison and typechecks. Measure with the React Profiler if the map ever feels slow. |

## Resolved
| ID | Issue | How |
| --- | --- | --- |
| M5-S7 | `.env` (holds the Gemini key) was readable by every user account on the Mac. | The team ran `chmod 600 .env` (now `-rw-------`); the server still reads the key. |
| M6-O1 | A sort could silently skip people. | Post-M6 step: the review says "N people had no suggestion and stay unsorted: …" (checked with a stubbed reply). |
| M6-I8 | Re-tagged ring-3 people stayed in the old band after a sort. | Post-M6 step: anyone whose ring or tag changed is placed fresh at their new sector; many changes restart the layout hot. Live: 111 sorted Work people, mean angle −92° (sector −90°), all within 60°. |
| M6-I9 | Hovering a review row wiped the Ask Connectwork highlights. | Post-M6 step: highlights are remembered on enter and restored on leave (checked). |
| M5-O2 | The answer sentence could miscount while the highlights were right. | Post-M5 step: when code changes the model's list, the card adds "· list checked against your data". Checked in the browser with a stubbed reply. |
| M5-O3 | A slow question couldn't be cancelled. | Post-M5 step: an AbortController per question; the card's Cancel, Escape, or a new question cancel it, and late replies are ignored. Checked: nothing appeared 12 s after Cancel; a second question replaced the first. |
| M3-S2 | Text bypassing `maxLength` would reach AI summaries. | CSV path: M4. Summary: M5 caps every field in `buildSummary`; the server caps question (500) and summary (400k). |
| M1-I4 | A failed first seed stayed failed until reload. | Post-M4 step: the memoized promise is cleared on failure, so the next call retries. |
| M1-S2 | Backup import checked only row shape. | Post-M4 step: zod schemas per table (`packages/shared/src/storedRows.ts`); every row validated before anything is replaced; unsafe links dropped; unknown fields stripped. 5 tests in `db/backup.test.ts`. |
| M1-S5 | No warning that backups are unencrypted. | Post-M4 step: hint under the backup buttons in Settings. |
| M1-O5 | *(Team decision)* Import replaced everything without asking. | Post-M4 step: **suggested default applied**, a two-step confirm ("Replace all your data with …?"). Easy to change if you prefer auto-export. |
| PX-S1 | *(Found in the post-M4 step)* Backups would include M16's `relayToken`, a secret. | Export keeps only `seeded`, `userContext` and `driftThresholds`; import ignores any other meta key. Tested. |
| M2-O1 | Initials failed contrast on light tags. | Post-M4 step: `contrastRatio` and `readableOn` (white or ink, whichever is higher; every default tag ≥ 4.88:1); `colors.test.ts` unskipped. |
| M3-E4 | Every edit re-rendered every node. | Post-M4 step: custom `memo` comparison on the fields a node draws (see PX-I1 for the catch). |
| M3-O5 | Delete person had no undo. | Post-M4 step: `deletePerson` returns a snapshot; the toast's Undo calls `restorePerson` (links to people deleted meanwhile are skipped). Tested and checked in the browser. |
| M3-O7 | Dates shown as ISO. | Post-M4 step: `formatDate` ("Sun, Oct 18"; year only when different), parsed as a local date; tested in three time zones. |
| M4-O3 | An import had no undo. | Post-M4 step: `undoImport` removes the added people (and anything attached) and clears only the fields the import filled. Toast Undo, 15 s. Tested; 154 → 40 in the browser. |
| M4-E5 | Papa Parse and the import dialog were in the main bundle. | Post-M4 step: `React.lazy`; a 26 KB chunk loaded the first time Import opens (checked in the browser). |
| M2-I4 | Escape only worked with focus inside the map. | M3: global `useHotkey('Escape')`. |
| M2-O6 | Empty state couldn't mention adding people. | M3: "Press N to add someone…" (M4 adds Import). |
| M3-I3 | `actions.ts` writes had no unit tests. | M3: `fake-indexeddb` plus 18 tests (team approved). |
