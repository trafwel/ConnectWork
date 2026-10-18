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
| — | Nothing open. M9's two live findings were fixed inside M9 (see the M9 review). | — |

## Waits for a milestone
| ID | Issue | Milestone |
| --- | --- | --- |
| M1-S4 | `javascript:` URLs in `linkedinUrl` or `email` would run if ever rendered as links. | Both import paths are now closed (CSV: M4-S1; backup: the M1-S2 row schemas drop unsafe links). Still: any milestone that renders them as `<a href>` must allow only `https:`/`mailto:`, because users can *type* anything into the card. |
| M2-E5 | Main bundle is over Vite's 500 KB warning: 700 KB at M10 (648 KB at M2), because d3 is on the first screen and zod (about 77 KB) arrived with backup validation. | M14 deploy: measure. zod stays in the main bundle (M5 must validate AI replies in the browser); keep snap/calendar behind `import()` like the import dialog. |
| M2-O5 | Filter tabs have no UI yet (highlights now come from Ask Connectwork, M5). | M7 (filter tabs). |
| PX-I1 | `PersonNode`'s custom memo comparison lists the fields a node draws. | M7 `flag` ✓, fix 2 ✓, M10 `drift` ✓. Any later milestone that draws a new field or prop must add it to `sameNode`, or that node won't update. |

## Team decision
| ID | Question | Claude's suggested default |
| --- | --- | --- |
| M4-I4 | Import drop zone not yet checked with a real keyboard. | Tab to the drop zone and press Space/Enter once. |
| M8-O2 | If the model gives a follow-up no reminder date, Approve only marks the card done. | Suggested default: approving a follow-up with no date marks its reminder **done** (you said you'll do it). Not applied yet. |
| F1-S2 | Relationship names you type are sent to Gemini with each question (as part of accepted links). | Keep it: the AI needs relationships. Free tier stays demo-data only. Say if you'd rather strip user-typed names from the summary. |
| M16-O1 | Add / remind / log / digest by text are not tried from a real phone yet (only "who do I know at Microsoft?"). | Text each once in the demo dry run. |
| M16-O4 | "Text me this" button on the weekly review not wired (`notifyOwner` + `/api/relay/notify` exist and are tested). | Small follow-up if time allows. |
| M13-O1 | Not live yet: VM, domain + DNS, OAuth origin and the VM's `.env` are human steps. | Follow [DEPLOY.md](DEPLOY.md) (about 30 minutes). Run `caddy validate --config /etc/caddy/Caddyfile` before the first reload. |
| M5-S9 | The live site has no login: anyone with the URL can spend our Gemini quota (30 requests/min per IP). One origin + localhost-only API now make the per-IP limit trustworthy (M13). | Suggested default: keep `DEMO_CACHE=replay` and the per-IP limit for the judging window; add a shared passcode only if we see abuse. |
| M11-O1 | Real Google sign-in not tested: it needs a Google Cloud OAuth client and test users (human step). | Follow guide §2, put the client id in `.env` as `VITE_GOOGLE_CLIENT_ID`, restart `pnpm dev`, then click "Connect Google Calendar" once. Until then the demo uses sample meetings. |
| M11-S5 | Scope `calendar.events` can read and write every event (needed for "Add to calendar"). | Keep it for the demo; a read-only scope would drop Google follow-ups. |
| M10-I7 | In the demo John Park drifts only slightly (210 days vs 180: 93% opacity, a little outward, dotted). | Leave the seed alone (the weekly review relies on it). If you want a stronger visual in the demo, set Settings → Drifting → Ring 2 to **120 days** before presenting, then Reset after. |
| M10-O3 | Highlighted list rows not yet checked with a screen reader. | Turn on VoiceOver (Cmd+F5), switch to List, ask a question, and listen to a highlighted row: it should say "(in the answer)". |
| M1-O5 | Import replaces everything without confirming. Should it ask first, or auto-export a backup? | A two-step confirm like Delete ("Replace all your data with this backup?"). It's consistent, needs no extra download, and is easy to change. *Applied in the fix step unless you say otherwise.* |

## Won't fix (for now)
| ID | Issue | Why |
| --- | --- | --- |
| MO-O1 | In the new recording, Abbey ↔ John is the **3rd** of 11 hidden-link suggestions, not the 1st (Gemini was rate-limited, so a fallback model answered). | The demo uses Accept all, and the link is still near the top. Re-recording costs another round of rate-limited calls. If the team wants it first: sort the sheet by confidence, or re-record `/links` once. |
| MO-O2 | In a background tab, positions don't animate (Chrome pauses frames) and the enter/leave timers slow to about 1 s. | Only tabs nobody is looking at. In a visible tab: 450 ms glide and fade, measured. |
| M1-E3 | Export builds the whole backup in memory. | A few thousand people is well under 10 MB. |
| M7-O2 | Reminder-flag pulse should stop for "reduce motion"; built but not checked live. | Team: turn on macOS Reduce Motion once and confirm the flags stop pulsing **and** the Ripple style shows one still ring (fix step 2, F2-O1). |
| S-O1 | Atlas polish not done: contour circles, crosshair, uppercase ring labels, bundled IBM Plex, darker tag palette. | Theme step T. |
| M7-O3 | On ring-3 dots the reminder flag is bigger than the dot. | Theme step T. The Ripple style (fix step 2) avoids it. |
| F2-O2 | Dragging people on a touch screen is untested. | Desktop-first demo; pointer events cover touch. |
| F2-O3 | Escape during a drag (cancel) not checked live. | Check once by hand: drag, press Escape before letting go; the person should stay put. |
| M7-O4 | "Done" on a reminder has no undo toast. | Untick it in the person card. |
| M6-O2 | No undo after accepting a sort. | The review sheet is the confirmation; each person can be changed on their card. |
| P5-O1 | Cancelling a question stops the *browser* waiting, but the server still finishes the Gemini call (quota is spent). | Passing the client's abort through to Gemini (`c.req.raw.signal` → SDK `abortSignal`) is possible; worth it only if quota gets tight. |
| M9-O1 | iPhone HEIC photos can't be decoded in Chrome. | A plain message tells the user how to switch to JPEG; not tested (no HEIC file). |
| M9-O2 | No undo after accepting snapped people. | The review is the confirmation; each person can be deleted with Undo. |
| M8-O1 | AI drafts may still invent small details (models vary). | Prompt rule added; drafts stay editable and are labelled "edit before sending". |
| M5-E2 | Every question sends the whole network (about 10k tokens at 154 people). | Fine on the free tier; the model needs the data. Trim only if cost matters. |
| M5-S5 | A crafted contact name could make the answer *sentence* misleading (prompt injection). | Ids are filtered in code and the answer is plain text; the residual risk is wording only. |
| M5-O5 | On a narrow window the corner answer card can overlap the outer ring. | Desktop-first demo. |
| F1-O1 | Labels move ahead of gliding nodes for about half a second when a click both pans and re-lays out the map. | Cosmetic; lines already did this. |
| F1-O2 | A label with no free spot is skipped. | Still in the node's screen-reader label and tooltip; hover or focus always shows it. |
| M11-O2 | "Not in your network → Add" not checked live (every sample attendee matches). | The name is guessed from the email; editable on the card. |
| M11-O4 | Completing a reminder doesn't delete its Google event. | As specified (stretch: PATCH it). |
| M13-S5 | The CSP still allows inline *styles* (`'unsafe-inline'` in style-src). | Needed for React style attributes and toast styles; style injection is far less dangerous than script injection. |
| M13-O3 | `pnpm preview:prod` approximates Caddy; Caddy itself wasn't run locally. | Its purpose is catching CSP errors in a real browser; the VM is the first real Caddy run. |
| M10-O2 | The 8 filter tabs are 8 Tab stops before the table. | An arrow-key group would be faster; acceptable for the demo. |
| M10-O5 | For imported people the AI summary still includes the LinkedIn connect date as last contact, so the model's sentence about "lost touch" could count them. | The highlighted list is computed in code with the gentle rule; the card flags when code changed the model's list. |
| M10-O6 | Map / List choice isn't remembered after a reload. | UI state by design; easy to persist later. |
| M2-E6 | Layout blocks the main thread for about 86 ms at 154 people. | Fine at hackathon scale; move to a Web Worker only above about 400 people. |
| M2-O4 | 114 unsorted imports form a thick wedge slightly outside ring 3. | M6 "Sort with AI" spreads them; zoom and pan reach them meanwhile. |
| M3-O6 | Removing the follow-up tag keeps its reminder. | By design: the reminder is a real task. |
| M4-O1 | The same person with no URL, email or company in two different files is imported twice. | The price of not merging namesakes; the user can delete one. |
| M4-O5 | A generic CSV ring outside 1–3 silently becomes ring 3. | The preview shows who lands; easy to move later. |
| PX-O1 | Undo of an import keeps any *new tags* it created. | Harmless (an unused tag), and removing tags could hit ones the user started using. |
| PX-I2 | The `PersonNode` memo fix wasn't measured at runtime: re-renders can't be observed without React DevTools. | It's a pure comparison and typechecks. Measure with the React Profiler if the map ever feels slow. |

## Resolved
| ID | Issue | How |
| --- | --- | --- |
| F1-I5 | `pnpm lint` failed locally because of the untracked nested `conNetWork/` folder. | Motion step: `eslint.config.js` ignores `conNetWork/**` and pins `tsconfigRootDir`. The folder itself is untouched. |
| M12-O1 | The full scripted demo had to be recorded (and couldn't replay after an import: random ids). | Polish: repeatable import ids + a fixed summary order; full flow recorded and replay-checked on Oct 18. Re-record on any other day ([DEMO_DAY.md](DEMO_DAY.md)). |
| F1-O5 | Escape inside Add connection not checked live. | Bug pass: checked; it closes only the form. |
| S-S1 | The inline no-flash theme script would be blocked by a strict CSP. | M13: allowed by its SHA-256 hash in the Caddyfile CSP (no `'unsafe-inline'` scripts); `scripts/deploy.test.ts` fails if the script changes without the hash. Checked in the browser via `pnpm preview:prod`. |
| M11-S6 | A strict CSP must allow Google sign-in and the Calendar API. | M13: `accounts.google.com` and `www.googleapis.com` only; Google's sign-in script loads under the policy (checked). |
| M5-I5 | "Lost touch" thresholds lived in the prompt and in `lib/drift.ts`. | M10: limits are editable in Settings and sent with each question when they differ from the defaults; the prompt uses the given limits. Server-tested. |
| M4-O4 | Imported "connected on" dates became last contact, so most imports looked "drifting". | M10: a LinkedIn person whose last contact is still their connect date doesn't drift, and the card/list say "No contact logged · connected …". Unit-tested. |
| M2-O2 | Keyboard Tab order on the map goes ring 3 → 1. | M10: the list view is the keyboard-first path (Enter opens the card and moves focus into it; Escape returns). Checked live. |
| M2-O3 | Neighbour names can overlap when someone is selected. | Fix step 1: all map text is placed by `placeLabels` in screen space, so no two labels overlap (tested; checked in the browser). |
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
