# Connectwork — Milestone self-reviews

Open items from every review are collected in [OPEN_ISSUES.md](OPEN_ISSUES.md); teach-back questions are in [TEACH_BACK.md](TEACH_BACK.md).

After every milestone Claude reviews its own work through four lenses (rule 3 in `CLAUDE.md`): **efficiency**, **integration**, **security & privacy**, and **other flaws**. Fixed items say what changed; open items say why they wait and where they belong.

## M1

**Data layer: IndexedDB, seeding, UI state, Settings** · Oct 17 · branch `m1-data`

**How it was checked:** typecheck, lint, tests (5 passed), production build. In the browser on a fresh database: first load shows 40 people (25 links, 4 reminders, 8 tags); a reload keeps the data; Reset gives back 40 and keeps "About you"; Delete everything (two clicks) leaves 0, still 0 after a reload; export → delete → import is byte-identical; three bad files and a 25 MB file are refused while the data stays as it was; no console errors.

### Efficiency
| | Finding | Status |
| --- | --- | --- |
| E1 | `demo/seed.json` (16 KB) was bundled into the main JS for every visit. | **Fixed:** dynamic `import()`, so it's its own 10 KB chunk, fetched only on a first visit or a reset. |
| E2 | `writeSeed` and `resetDemoData` repeated the same four writes. | **Fixed:** one `putSeed()` used by both. |
| E3 | Export reads every table into memory and pretty-prints it. | Open, fine for now: a few thousand people is well under 10 MB. Revisit only if real networks get much bigger. |

### Integration
| | Finding | Status |
| --- | --- | --- |
| I1 | React StrictMode runs effects twice in development, which could seed twice. | **Handled:** `ensureSeeded` memoizes its promise (and `bulkPut` is idempotent anyway). |
| I2 | `useLiveQuery` only notices writes made **through Dexie**. A write behind its back (raw IndexedDB) showed up only after a reload. | Rule for M3+: every write goes through `db/actions.ts` (Dexie). |
| I3 | Dexie transactions auto-commit if you `await` a non-Dexie promise (a fetch or a dynamic import) inside them. | **Designed around:** the demo file is loaded *before* the transaction opens. Same rule for every later milestone. |
| I4 | A Reset during a failed first seed: the memoized `ensureSeeded` promise stays rejected until a reload. | Open, acceptable: the page shows "This browser blocked local storage", and reloading retries. |

### Security & privacy
| | Finding | Status |
| --- | --- | --- |
| S1 | Import replaced the data in two steps (clear, then write). A bad file halfway through would lose data. | **Fixed:** everything is validated first, then clear + write run in **one** transaction, so any error rolls back. |
| S2 | Import trusted any JSON with `app: 'connectwork'`. | **Fixed (shape-level):** version must be 1, and every row must be an object with a string primary key. **Open:** field-level validation (zod schemas for stored rows) is a later hardening task. |
| S3 | A huge file would freeze the tab in `file.text()`. | **Fixed:** 20 MB cap. |
| S4 | A backup or CSV can contain `javascript:` URLs (e.g. `linkedinUrl`). React escapes text but not `href`. | **Open, M3:** nothing renders them as links today. A SECURITY note is in the `PersonCard.tsx` scaffold: allow only `https:`/`mailto:`. |
| S5 | Exported backups contain notes in plain text. | Open, by design: the file is the user's own copy. Consider a "not encrypted" hint in Settings. |
| S6 | Does M1 send any data out? | No. The only network call is `/api/health` (no user data). The demo people are fictional. |

### Other flaws
| | Finding | Status |
| --- | --- | --- |
| O1 | Reset and Delete had no error handling: a failure would be silent. | **Fixed:** one `run()` helper shows an error toast. |
| O2 | A double-click could start two imports or clears at once. | **Fixed:** buttons are disabled while an action runs. |
| O3 | `URL.revokeObjectURL` right after `click()` can cancel the download in some browsers. | **Fixed:** deferred one tick. |
| O4 | `pdf-lib` stamped the current time into `roster.pdf`, so the generator wasn't deterministic. | **Fixed:** fixed creation/modification date. Every demo file is now byte-identical across runs. |
| O5 | Import replaces everything without a confirm step. A valid but wrong backup overwrites current data. | Open, a team decision: add a confirm like Delete's, or auto-export first? |
| O6 | Version-check message said "newer version" for any wrong version. | **Fixed:** "Unsupported backup version". |

### Teach-back
Questions moved to [TEACH_BACK.md](TEACH_BACK.md#m1) (still open).

## M2

**Ring map: layout, nodes, links, pan/zoom, focus on click** · Oct 17 · branch `m2-ring-map`

**How it was checked:** typecheck, lint, 11 tests (new: initials, due reminders, filters, ring geometry, safe colors), production build. In the browser:
- 40 people in three rings, clustered by tag.
- Clicking Samuel centres him (0 px off), his 2 links go bold, the other 23 fade, and his neighbours' names show.
- Clicking empty space, Enter on a focused node, and Escape all work.
- Wheel zoom to 1.95× shows ring-2 names; Reset view returns to identity and hides itself.
- Store-driven Work filter dims exactly the 28 non-Work people; highlighting Microsoft shows exactly its 3 people.
- Editing notes moves nobody. Changing John's ring moves him 60 px, with a median nudge of 2.3 px for everyone else.
- 114 extra ring-3 people: drawn 99 ms after the write (longest task 86 ms), staying at 0.40–0.52 of the map size, around ring 3 at 0.46.
- Abbey ↔ John still unlinked after a reset. No console errors after a clean reload.

### Efficiency
| | Finding | Status |
| --- | --- | --- |
| E1 | `useLiveQuery` gives a new array on *any* change, so editing notes would re-run the 150-node simulation and nudge people. | **Fixed:** a layout key (id, ring, tag, offset and links) means only position-relevant changes re-run it. Verified: a notes edit moved 0 people. |
| E2 | Raw zoom passed to every memoized node meant all of them re-rendered on every zoom frame. | **Fixed:** nodes get a zoom value snapped to the label thresholds (1 / 1.3 / 2.2). `LinkLine` is memoized too. |
| E3 | Restarts at alpha 0.3 still ran the full 135 ticks. | **Fixed:** the tick count comes from the starting alpha (111). |
| E4 | Draw order was re-sorted on every zoom frame. | **Fixed:** `useMemo` on `people`. |
| E5 | Main bundle is 524 KB (gzip 170 KB), over Vite's 500 KB warning, now that d3 is in. | Open: the map *is* the first screen, so splitting it doesn't help. Revisit at deploy (M14); keep later heavy features (snap, calendar) behind `import()`. |
| E6 | The layout blocks the main thread for about 86 ms at 154 people. | Open, fine at hackathon scale. Above about 400 people, move it to a Web Worker. |

### Integration
| | Finding | Status |
| --- | --- | --- |
| I1 | The layout ran in `useEffect` (after paint), so one frame showed empty rings. | **Fixed:** `useLayoutEffect`. The first visible frame is complete (screenshot taken straight after load). |
| I2 | A 0×0 container (hidden pane, collapsed panel) must not produce a broken layout. | **Handled:** the layout skips zero sizes; measure on mount plus a ResizeObserver catches up when shown. |
| I3 | `PersonCard` (M3) will narrow the map when it opens. | **Ready:** App already renders `<PersonCard>` on selection (null until M3), and centring waits for a layout computed at the new size. |
| I4 | Escape works only while focus is inside the map. | Open, for M3: a global `useHotkey('Escape')` once that hook exists. |
| I5 | A "change in the order of Hooks" console error. | Not a bug: hot reload swapped `useEffect` → `useLayoutEffect` on a live component. A clean reload shows none. |
| I6 | Testing lesson: after hot reloads, Vite serves `useStore.ts?t=…`, so `import('/src/store/useStore.ts')` in a test script gets a *second* store the app ignores. | Noted: test scripts import the URL from `performance.getEntriesByType('resource')`. |

### Security & privacy
| | Finding | Status |
| --- | --- | --- |
| S1 | Tag colours come from IndexedDB, which an imported backup can fill. `background: url(https://…)` would make the browser fetch a tracking URL. | **Fixed:** `safeColor()` renders only hex colours (tested). |
| S2 | Names, companies and link labels are rendered as SVG text and `<title>` by React, so they're escaped. No `dangerouslySetInnerHTML`. | OK. |
| S3 | Does M2 send anything out? | No network calls. The M0 health line is gone from the screen. |

### Other flaws
| | Finding | Status |
| --- | --- | --- |
| O1 | `readableOn` is still the step-T stub (always white), so white initials on School orange, Clubs sky and intro yellow fail 4.5:1 contrast. | Open, **step T**: its skipped tests in `colors.test.ts` define the fix. |
| O2 | Keyboard Tab order follows draw order (ring 3 → ring 1), so keyboard users meet the outer dots first. | Open: the M10 list view is the keyboard-first equivalent. Revisit with a roving tabindex if time allows. |
| O3 | When someone is selected, neighbour names can overlap (Abbey Chen / Omar Choi). | Open, cosmetic: step T or a label-nudge pass. |
| O4 | 114 grey imports form a thick wedge, slightly outside ring 3 (up to 0.52). On a very short, wide window a few could clip. | Open: zoom and pan reach them, and M6 "Sort with AI" spreads them into sectors. |
| O5 | Filter and highlight have no UI yet. | Expected: M5 (agent highlights) and M7 (filter tabs). Verified through the store. |
| O6 | The empty-state text can't mention Import or N yet. | Expected: a comment in `App.tsx` says to update it in M3/M4. |

### Teach-back
Questions moved to [TEACH_BACK.md](TEACH_BACK.md#m2) (still open).

## M3

**Every write in `actions.ts`, the person card, quick add, hotkeys** · Oct 17 · branch `m3-person-card`

**How it was checked:** typecheck, lint, tests (new: `normalizeLink`, `isOverdue`, `describeLastContact`), production build. In the browser:
- Opening John's card narrows the map to 864 px, and John is re-centred at exactly (0, 0).
- Company typed and saved on Enter. Ring changed with the arrow keys (focus and tab stop follow). The map node's label updates live.
- Log contact writes a history row, sets `lastContact` to today, and the card says "Today".
- A field focused but untouched while the value changes elsewhere keeps the **new** value on blur.
- Giving Abbey `follow-up` creates exactly one reminder 7 days out, even when re-added.
- Links: stored once with the smaller id first; an AI "suggested" never downgrades an accepted link; links to a missing person and self-links are refused; no orphan contact logs.
- Remove link → Undo restores it.
- Delete person (two clicks) removes the person, their links, reminders and logs.
- Edits survive a reload.
- Overdue reminder shows "· overdue" at **4.77:1** contrast.
- Keyboard only: N → name → Enter adds a node; Escape closes the card, then the dialog.
- No console errors on a clean load.

### Efficiency
| | Finding | Status |
| --- | --- | --- |
| E1 | Checking for unknown tags did one `get` per tag. | **Fixed:** `ensureTags()` uses one `bulkGet`. |
| E2 | Saving text on every keystroke would mean one write, and one live-query round, per letter. | **Done by design:** save on blur/Enter, so one write per edit. |
| E3 | Card connections: one query for the links plus one `bulkGet` for the other people (not one `get` per link). | Done. |
| E4 | `useLiveQuery` returns *new objects for every person* after any edit, so `React.memo` on `PersonNode` can't skip anyone: all nodes re-render per edit. The layout itself is skipped (M2 key). | Open, cheap at 40–150 people. Fix later if needed: a custom memo comparison on the fields a node draws. |

### Integration
| | Finding | Status |
| --- | --- | --- |
| I1 | Opening the card narrows the map. | **Verified:** centring waits for the layout at the new width (built in M2), and the selected person lands at (0, 0). |
| I2 | Escape had two owners (the map in M2, and now global). | **Fixed:** one global `useHotkey('Escape')`. Inside a field, the first Escape cancels the edit instead of closing the card. |
| I3 | The write functions in `actions.ts` had no unit tests: IndexedDB doesn't exist in Node. | **Fixed (team approved):** `fake-indexeddb` as a dev dependency; `db/actions.test.ts` has **18 tests** covering every rule, including a rollback test. Mutation-checked: removing the transaction from `updatePerson` makes that test fail. SPEC.md §3 and §10.5 updated. |
| I4 | `applyImport` is still a stub. | Expected: M4. |
| I5 | Testing lesson: in the hidden browser pane, screenshots can show a stale frame and Base UI's focus waits for an animation frame. | Noted: read state with scripts between steps, don't trust a single screenshot. |

### Security & privacy
| | Finding | Status |
| --- | --- | --- |
| S1 | `javascript:` URLs in LinkedIn/email (M1 S4). | Still safe: they're shown as **inputs**, never as clickable links. The note stays in the card scaffold. |
| S2 | Unbounded text would end up in AI summaries (M5). | **Partly fixed:** `maxLength` on every field (name 120, fields 300, notes 5,000, tags 40, reminders 200). **Open, M4/M5:** imports bypass the UI, so the server-side zod schemas must cap lengths too. |
| S3 | Does M3 send anything out? | No network calls. Notes stay in IndexedDB. |
| S4 | New tag names typed by the user get `FALLBACK_COLOR`, and colours render through `safeColor` (M2). | OK. |

### Other flaws
| | Finding | Status |
| --- | --- | --- |
| O1 | Each field copied the stored value into a draft *once*; a later change from elsewhere was overwritten on the next blur. | **Fixed:** the draft exists only while typing (`EditableText`). Verified. |
| O2 | Overdue dates in `#D55E00` were about 3.9:1 contrast, and colour was the only signal. | **Fixed:** the theme's destructive colour (4.77:1) plus the word "overdue". |
| O3 | Removing a link was permanent, and there's no add-link button until M6. | **Fixed:** toast with Undo. |
| O4 | Double Enter in Quick add, blank names, primary tag missing from `tags`. | **Fixed:** submit guard; `addPerson` rejects blank names; `updatePerson` keeps the old name on blank and always keeps the primary tag in `tags`. |
| O5 | Delete person has no undo (two-click confirm only). | Open: restoring a person plus links, reminders and logs needs a snapshot. Worth it only if testers delete by mistake. |
| O6 | Removing the follow-up tag doesn't remove its reminder. | By design: the reminder is a real task the user may still want. |
| O7 | Dates show as ISO (`2026-10-24`). | Open, cosmetic: step T. |

### Teach-back
Questions moved to [TEACH_BACK.md](TEACH_BACK.md#m3) (still open).

## M4

**CSV import: LinkedIn export or any CSV** · Oct 17 · branch `m4-csv-import`

**How it was checked:** typecheck, lint (0 warnings), 52 tests (new: 13 acceptance tests in `csv.test.ts` unskipped, 5 hardening tests, 3 `applyImport` tests including a rollback), production build. In the browser, by dropping files on the drop zone:
- `demo/Connections.csv` previews "120 people found · 114 new · 6 already here". Importing adds 114 people on ring 3 (grey LinkedIn) with company, role, URL, and connection date as last contact. The 6 seed matches are not duplicated, and Abbey ↔ John is still unlinked.
- Re-importing the same file: **0 new**. It filled one field I'd cleared, and kept a company I'd edited ("My own edit").
- A generic CSV guesses the columns. Unmapping Name shows "Choose which column holds names." and disables Import. A `.png` is refused.
- No console errors.

### Efficiency
| | Finding | Status |
| --- | --- | --- |
| E1 | Matching each row against every person is O(n × m), about a million comparisons for 1,000 × 1,000. | **Fixed:** `planImport` builds lookup maps once (`MatchIndex`). A test plans 3,000 × 3,000 in under 200 ms. |
| E2 | `drafts.slice()` made a new array every render, so the plan was recomputed every render. | **Fixed:** memoized (lint caught it). |
| E3 | `applyImport` updated matched people one at a time. | **Fixed:** one `bulkUpdate`. |
| E4 | 114 imported people make the layout block for about 86 ms (M2-E6). | Unchanged; see OPEN_ISSUES. |

### Integration
| | Finding | Status |
| --- | --- | --- |
| I1 | The preview could be stale if people change while the dialog is open. | **Handled:** the preview uses a live query, and Import re-plans against the database at click time. |
| I2 | M6 needs the ids of the people just imported. | **Ready:** `applyImport` returns them. |
| I3 | Demo story: the 6 seed people in the CSV match by LinkedIn URL. | Verified: no duplicates, Abbey ↔ John unlinked. |
| I4 | Keyboard: the drop zone is a `<label>` around a visually hidden file input, so Tab reaches the input and the label shows a focus ring. | Built as specified; **not yet checked with a real keyboard** (the browser pane can't open a native file picker). |
| I5 | Testing lesson: `db.people.where('source')` throws because `source` isn't indexed. | Expected: only indexed fields can use `where()`. |

### Security & privacy
| | Finding | Status |
| --- | --- | --- |
| S1 | A crafted CSV could plant `javascript:` in `linkedinUrl` or a junk email. | **Fixed:** URLs are kept only if they point at `linkedin.com`, and emails only if they look like one (tested). Closes M1-S4 for the import path. |
| S2 | Imported text bypassed the UI's `maxLength`. | **Fixed:** the same caps (name 120, fields 300, tags 40). Closes M3-S2 for imports; M5 still caps on the server. |
| S3 | Upload? | None: `file.text()` in the browser. The dialog says so. |
| S4 | Huge files. | **Fixed:** 10 MB file cap; at most 2,000 people per import, and the preview says so when it trims. |
| S5 | CSV formula injection (`=HYPERLINK(...)`). | Not applicable: we never write CSV files that a spreadsheet would open. |
| S6 | A file can't overwrite an existing person by putting their id in a row. | **Tested:** ids are always generated fresh. |

### Other flaws
| | Finding | Status |
| --- | --- | --- |
| O1 | Name-only matching would merge two different "Alex Kim"s. | **Fixed:** name + company matches only when both have a company (tested). Trade-off: the same person with no URL, email or company in two different files is imported twice. |
| O2 | My first rollback test for `applyImport` didn't test what its name said. | **Fixed:** replaced with a real rollback test plus an honest id test. |
| O3 | An import of 114 people has no undo. | Open: **fix now** (see OPEN_ISSUES). |
| O4 | Imported "connected on" dates become last contact, so most imports will look "drifting" in M10. | Open: M10 should treat `source: 'linkedin'` people with no logged contact gently. |
| O5 | A generic CSV with an out-of-range ring (e.g. 9) silently falls back to ring 3. | Won't fix: the preview shows everyone landing; they can be moved later. |

### Teach-back
Questions in [TEACH_BACK.md](TEACH_BACK.md#m4).

## Open-issues step (after M4)

**Fixing the "fix now" group from [OPEN_ISSUES.md](OPEN_ISSUES.md)** · Oct 17 · branch `m4-csv-import`

**What changed:** ten items fixed. See OPEN_ISSUES → Resolved for each one.

**How it was checked:** typecheck, lint (0 warnings), tests (new: 5 backup tests, 3 undo tests, 2 date-format tests run in UTC, Seattle and Tokyo, 3 colour tests unskipped), production build. In the browser:
- Initials are dark on pink and green and white on blue.
- The import chunk isn't loaded until Import opens.
- Import → Undo goes 154 → 40.
- Delete John → Undo brings him back with his link and reminder, and reopens his card.
- The reminder reads "Sun, Oct 18".
- Settings shows the "not encrypted" hint. Choosing a backup only asks; Cancel keeps the data; a tampered file is refused with the exact row and field; a valid file replaces.
- No console errors.

### Self-review of the fixes
| | Finding | Status |
| --- | --- | --- |
| Efficiency | Backup validation brings zod (about 77 KB) into the main bundle (571 → 648 KB). | Accepted: M5 needs zod in the browser anyway. Logged under M2-E5. The import dialog split saved 26 KB. |
| Integration | `PersonNode`'s new memo comparison must learn about any new drawn field. | Logged for M7/M10 (PX-I1), with a ⚠ comment on `sameNode`. |
| Integration | The memo fix isn't measured at runtime. | Logged (PX-I2). |
| Security | Backups would have carried the M16 relay token. | **Fixed** and tested (PX-S1). |
| Security | The backup schemas *clean* unsafe links instead of rejecting the file. | Deliberate: the card lets users type any text, so one odd link mustn't make a whole backup unusable. |
| Other | Long file names broke mid-word in the import confirm. | **Fixed:** truncated, with the full name in a tooltip. |
| Other | Undo of an import keeps new tags it created. | Won't fix (PX-O1). |

### Teach-back
Questions in [TEACH_BACK.md](TEACH_BACK.md#open-issues-step-after-m4).

## M5

**Ask Connectwork: question → server → Gemini → highlights** · Oct 17 · branch `m5-ask`

**How it was checked:** typecheck, lint (0 warnings), **94 tests**. Server: 16 acceptance tests unskipped, plus 7 new ones (fallback chain, time budget, date header, rate limit, faked `X-Forwarded-For`). Browser: summary, exact match, grounding, drift. Production build.

**Live, against the real Gemini API** (free tier, fictional demo data only):

| Question | Time | Result |
| --- | --- | --- |
| Who do I know at Microsoft? | 7.3 s | Abbey, Nina, Owen + John ("former Microsoft intern"): all 4, correct |
| Who should I follow up with this week? | 6.8 s | The 4 people with reminders due; filter switched to "due" |
| Who have I lost touch with? | 5.1 s → 7.8 s | **First run wrong** (1 of 5 right, plus 1 wrong person). After the fix, highlights come from the drift rule: exactly 5 |
| Who went to University of Washington? | 2.8 s → 3.8 s | **First run** said "7" and highlighted someone from Seattle University. After the fix: exactly the 9 |
| Who do I know at Apple? | 2.8 s | "You don't have anyone…", nothing highlighted |
| Where does Abbey Chen work? | — | One person → her card opens |

Also: an unreachable server shows a red message; Escape clears everything; the server log has route, status and latency only (0 names or questions); no console errors.

### Efficiency
| | Finding | Status |
| --- | --- | --- |
| E1 | Worst case with 20 s + 40 s + 40 s timeouts was 100 s of "Thinking…". | **Fixed:** the fallback chain stops after a 60 s budget (tested). |
| E2 | Every question sends the whole network (about 2.5k tokens for 40 people, about 10k for 154). | Open, won't fix for now: fine on the free tier, and the model needs the data. Trim to relevant people only if cost matters. |
| E3 | The demo cache rewrites its whole file on each recorded reply. | Fine at demo size; written via temp file + rename so a crash can't corrupt it. |

### Integration
| | Finding | Status |
| --- | --- | --- |
| I1 | The answer card sat at the top centre, **over the Work sector** (12 o'clock), hiding 2 of the 4 Microsoft people it was answering about. | **Fixed:** top-left corner, outside the rings. Verified: nobody underneath at 1280 px. |
| I2 | `filterHint: "drifting"` would switch to a filter whose set is empty until M10, dimming everyone. | **Fixed:** only `due` switches the filter in M5; drifting people are shown as highlights. |
| I3 | "Today" was the server's **UTC** date, a day ahead every evening in Seattle (and on a UTC cloud VM). | **Fixed:** the browser sends its local date in `x-client-date`. It's a header, not the body, so demo-cache keys stay stable across days. Accepted only within ±1 day. Tested. |
| I4 | `env.ts` had one fallback model; the scaffold and guide expect a chain. | **Fixed:** `GEMINI_FALLBACK_MODELS` list; the old single variable still works. |
| I5 | The "lost touch" thresholds now live in two places: the prompt and `lib/drift.ts`. | Open (waits for M10): if Settings makes them editable, send them with the query. Comments in both files. |
| I6 | `driftLevel()` (M10 step 1) was implemented early because M5 needed it. | Done with tests; M10 keeps steps 3–7. |

### Security & privacy
| | Finding | Status |
| --- | --- | --- |
| S1 | The API key stays on the server. | ✅ Health reports only `aiConfigured: true/false`. |
| S2 | What leaves the browser. | The summary: names, rings, tags, company, role, school, dates, accepted links, open reminders. **Never notes.** Every field is capped (closes the rest of M3-S2). |
| S3 | Logging. | Route, status, latency and cache only; AI errors log a code plus a truncated SDK message. Verified: 0 names or questions in the dev log. |
| S4 | The rate limiter trusted `X-Forwarded-For`, so a client could fake a new IP per request and dodge the limit. | **Fixed:** trusted only with `TRUST_PROXY=1` (behind Caddy); otherwise the real socket address. Expired entries are swept. Tested. |
| S5 | Prompt injection via a contact's name or company. | Mitigated: the prompt says data is not instructions, ids are filtered in code, and the answer is shown as plain text. Residual: a crafted name could make the *sentence* misleading. Accepted. |
| S6 | Free tier: Google may use requests to improve its products. | The banner says "use sample data only"; demo data is fictional. **Don't import real contacts until `GEMINI_TIER=paid`.** |
| S7 | `.env` (holds the key) is readable by every user account on the Mac (`-rw-r--r--`). | **Resolved:** the team ran `chmod 600 .env` (now `-rw-------`). |
| S8 | `demo/demo-cache.json` stores model answers, which name people. | Record only with fictional demo data (comment in `cache.ts`). |
| S9 | The deployed server has no login, so anyone who can reach it can spend our Gemini quota (30/min per IP). | Waits for M13/M14 deploy (see OPEN_ISSUES). |

### Other flaws
| | Finding | Status |
| --- | --- | --- |
| O1 | **The model's lists were wrong in both directions** in live testing (missed people; added someone from Seattle University for "UW"; named a non-drifting person). | **Fixed in code:** model ids are kept only if grounded in the named company/school; plus exact matches; "lost touch" is the drift rule. Tested. |
| O2 | The answer *sentence* can still miscount ("7 people") while 9 are highlighted. | Open, **fix now:** say when the list was checked against your data. |
| O3 | A slow question (up to 60 s) can't be cancelled; you must wait. | Open, **fix now:** Escape or ✕ cancels the request. |
| O4 | No memory between questions ("and who else?"). | By design for now: M17 (Backboard) adds conversation memory. |
| O5 | On a narrow window the corner card can overlap the outer ring. | Won't fix: desktop-first demo. |

### Teach-back
Questions in [TEACH_BACK.md](TEACH_BACK.md#m5).

## Open-issues step (after M5)

**Fixing M5-O2 and M5-O3** · Oct 17 · branch `m5-ask`

**What changed:**
- **Questions can be cancelled.** An AbortController per question: the card's Cancel, Escape, or a new question cancels it, and a late reply is ignored.
- **The card says when code corrected the model's list:** "· list checked against your data".

**How it was checked:** typecheck, lint, tests. In the browser:
- Cancel while thinking: the card cleared, and nothing appeared 12 s later.
- Two questions in a row: only the second answer showed.
- A stubbed reply naming 2 of 3 Microsoft people: 3 highlighted, and the note appeared.
- No console errors.

| | Finding | Status |
| --- | --- | --- |
| Efficiency | Cancelling stops the browser waiting, but the server still completes the Gemini call. | Logged (P5-O1, won't fix for now). |
| Integration | "Busy" now has two ways to end (answer or cancel). The abort fires only on a cancel, because the request is cleared *before* the answer is stored. | Verified both paths. |
| Integration | The global Escape (outside the box) still clears the answer but doesn't cancel a request in flight. | Acceptable: the card's Cancel button and Escape *in* the box both cancel. |

### Teach-back
Questions in [TEACH_BACK.md](TEACH_BACK.md#open-issues-step-after-m5).

## M6

**Step R (route helper) + Sort with AI + Find hidden links + the review sheet** · Oct 17 · branch `m6-review`

**How it was checked:** typecheck, lint (0 warnings), tests (server 26: the unchanged `/query` tests after step R, plus classify and links guardrail tests; browser: 3 new action tests), production build.

**Live, against Gemini** (fictional demo data):
- **Find hidden links** (2.2 s): 10 suggestions with **Abbey Chen ↔ John Park, "both Microsoft, both UW", 90%**. I checked all 10 evidence labels against the data, and all were true.
- **The review sheet:** hovering a row highlights its 2 people. Accepting only Abbey ↔ John made it a real link (25 → 26 links) and removed the other 9 dashed lines. A second run (20.4 s) didn't re-suggest Abbey ↔ John, and Dismiss brought the links back to exactly 26.
- **Sort with AI** (7.7 s) on the 114 imported people: 112 suggestions, each with a reason about the person ("Software Engineer at Zillow"). The 9 ring-2 picks were all justified (8 at Microsoft, the company in "About you"; 1 met 38 days ago). Accept all → "Applied 112 changes", and the grey band turned into Work clusters.
- No console errors; no names in the server log.

### Efficiency
| | Finding | Status |
| --- | --- | --- |
| E1 | Accepting 112 sort suggestions as 112 `updatePerson` calls = 112 transactions. | **Fixed:** `applyClassification`, one transaction. |
| E2 | Suggesting / resolving links one at a time. | **Fixed:** `addSuggestedLinks` and `resolveLinks`, one transaction each. |
| E3 | Classify sends only what's needed to sort (name, company, role, school, metAt). | No notes, no tags, no ids beyond the person's. |
| E4 | `/links` took 2.2 s once and 20.4 s the next time. | Free-tier variance; the 60 s chain budget covers it. |

### Integration
| | Finding | Status |
| --- | --- | --- |
| I1 | Step R moved `/query` onto `structured()`. | **Proven by tests:** `ai.test.ts` unchanged and green. |
| I2 | `links.ts` importing `summaryIds` from `ai.ts` (which registers `links.ts`) would be circular. | **Avoided:** shared helpers live in `structured.ts`; `ai.ts` re-exports them. |
| I3 | Hidden links are written as dashed *before* the decision, so "Dismiss changes nothing" was false. | **Fixed:** `onDismiss` removes the links this run created (not ones that existed before). Verified 33 → 26. |
| I4 | Escape, Ask Connectwork or clicking a person would orphan an open review. | **Fixed:** `clearFocus` and `selectPerson(null)` return to the review while one is open. |
| I5 | The scaffold's sort write replaced a person's tags, which would drop tags added after import. | **Fixed:** the user's tags are kept; only the grey "LinkedIn" placeholder is dropped. Tested. |
| I6 | The import toast needs both "Sort with AI" and Undo. | Sort with AI is the main action; Undo is the secondary one (sonner `cancel`). |
| I7 | `canonicalJson` moved to `@connectwork/shared` for M12's browser cache. | Done; the server re-exports it, and the tests still pass. |
| I8 | After a sort, the newly blue people stay in the upper-left band instead of moving to the Work sector: the layout restarts "cool" (alpha 0.3) and ring 3's sector pull is weak. | Open, **fix now**. |
| I9 | Hovering a review row sets highlights, and leaving it sets them to *nothing*, wiping the highlights of an earlier Ask Connectwork answer. | Open, **fix now**. |

### Security & privacy
| | Finding | Status |
| --- | --- | --- |
| S1 | `PersonBrief` (each person sent to `/classify`) had no length limits. | **Fixed:** name 120, fields 300, allowed tags 20 × 40. A test checks a 121-character name is refused. |
| S2 | "About you" goes to Gemini with every sort. | Settings says so under the field; at most 500 characters; it's the user's own text. |
| S3 | Guardrails **in code**: classify (unknown ids, unknown tags, **ring 1 → 2**, duplicates) and links (self, unknown, already linked, the same pair twice). | Tested on both routes. |
| S4 | Link labels are model text, shown in the UI and stored. | Capped at 60 by the schema; React shows them as text. |
| S5 | Logging. | Verified: no names, companies or schools in the server log. |

### Other flaws
| | Finding | Status |
| --- | --- | --- |
| O1 | The model silently skipped 2 of 114 people (both "Software Engineer Intern"). They stay grey, but the user isn't told. | Open, **fix now**: say "N people had no suggestion" in the review. |
| O2 | No undo after accepting a sort. | Won't fix for now: the review sheet *is* the confirmation step, and each person can be changed from their card. |
| O3 | Double-clicking a flow would start two 20 s calls. | **Handled:** one AI flow at a time ("Already working on it…"). |

### Teach-back
Questions in [TEACH_BACK.md](TEACH_BACK.md#m6).

## Step S: style switching

**Intermediary step after M6 (requested Oct 17): switch the app's look at runtime** · branch `m6-review`

**What was built:** Settings → Appearance with **Style** (Neutral | Atlas, the theme-canvas pick) and **Mode** (System | Light | Dark).
- `index.css` has one palette per style/mode, including new `--map-*` variables, and `graph/theme.ts` reads only those variables.
- `lib/appearance.ts` sets `<html data-style class="dark">` and saves the choice per device.
- A tiny inline script in `index.html` applies it **before React loads** (no flash).
- The pick-one keyboard pattern moved into a shared `Segmented` control, which RingPicker now uses too.

**How it was checked:** typecheck, lint, 106 tests (new: parsing saved choices, resolving System). Contrast computed for every text pair in Atlas light and dark: all ≥ 4.5:1 (lowest 4.83). In the browser:
- Neutral → Atlas: paper background, solid ink rings, mono labels, teal accent.
- Mode changed by keyboard only: arrows move both selection and focus, one Tab stop.
- Atlas dark kept after a reload; Neutral dark checked.
- RingPicker still changes a ring by keyboard.
- **System mode follows the OS live**, in both directions, using the pane's colour-scheme emulation.

| | Finding | Status |
| --- | --- | --- |
| Efficiency | Switching changes CSS variables only, so the map and components restyle without React re-rendering them. | ✅ |
| Integration | Toasts read a `next-themes` provider we never added, so they ignored our mode. | **Fixed:** App passes `theme` to the Toaster. |
| Integration | The free-tier banner had fixed amber colours (bright in dark mode). | **Fixed:** `dark:` variants. |
| Integration | First live test: after switching the OS scheme while the page loaded, the page stayed dark. The update depended on a React state *change*, which can be a no-op. | **Fixed:** the OS listener re-applies the theme directly. Re-tested with the same sequence. |
| Integration | RingPicker rebuilt on `Segmented`. | Verified by keyboard in a person card. |
| Security | No Google Fonts request: Atlas uses IBM Plex only if installed, else the system mono font. `localStorage` holds only `{style, mode}`. | ✅ |
| Security | The no-flash script is inline; a strict Content-Security-Policy (M13 deploy) would block it. | Open (waits for M13): allow it by hash. |
| Other | Tag colours are the same in every style: the colourblind-safe palette, stored with your data. | By design. Atlas's darker variants stay a step-T decision. |
| Other | Atlas details not yet done: contour circles, the crosshair through "You", uppercase "R1 CLOSE" labels, bundled IBM Plex. | Open (waits for theme step T). |

### Teach-back
Questions in [TEACH_BACK.md](TEACH_BACK.md#step-s-style-switching).

## Open-issues step (after M6)

**Fixing M6-O1, M6-I8, M6-I9** · Oct 17 · branch `m6-review`

**What changed:**
- **Skipped people are named.** The review says who had no suggestion.
- **Sorted people move to their sector.** People whose ring or tag changes are placed fresh at their new spot; many changes at once restart the layout hot.
- **Hover no longer wipes highlights.** Hovering a review row restores the previous highlights on leave.

**How it was checked:** typecheck, lint, tests. In the browser:
- Live sort of 114 people → Accept all: the 111 ring-3 Work people now sit around the Work sector (mean −92°, all within 60° of −90°). Before, they stayed in the upper-left band.
- An Abbey highlight survived hovering and leaving a row.
- A stubbed reply skipping one person showed "1 person had no suggestion and stays unsorted: Zoe Xu" (the wording was fixed for the singular).

| | Finding | Status |
| --- | --- | --- |
| Integration | Changing *one* person's ring or tag now also places them fresh at their new spot (a glide, not a nudge). | Intended: clearer than a small shuffle. The M2 "median 2.3 px" stability for everyone *else* still holds. |
| Testing lesson | `performance.getEntriesByType('resource')` lists every hot-reloaded version of a module; the first match can be a stale copy with its own store. | Use the **last** match (it bit once here). |

### Teach-back
Questions in [TEACH_BACK.md](TEACH_BACK.md#open-issues-step-after-m6).
