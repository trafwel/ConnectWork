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
