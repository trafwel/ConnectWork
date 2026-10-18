# Connectwork — Milestone self-reviews

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

### Teach-back (open: the team will answer these later)
1. In M3, someone writes a new person with `indexedDB.open(...)` directly instead of `db.people.add(...)`. What will the user see, and why?
2. Why does "Delete everything" leave `seeded` set to true? What would happen on the next reload if it didn't?
3. In `resetDemoData`, why is the demo file loaded *before* `db.transaction(...)` and not inside it?
4. The seed says John was last contacted "210 days ago". Why store that number instead of the date `2026-03-21`?

Decision still open: **O5**. Should Import ask for confirmation, or auto-export a backup first?

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

### Teach-back (open: the team will answer these later)
1. Why does the layout run all of its ticks at once, in a layout effect, instead of animating tick by tick? What two problems does that solve?
2. Editing someone's notes doesn't move anyone on the map, but changing their ring does. What makes the difference in the code?
3. Why are people outside a filter *dimmed* instead of removed from the map?
4. Why does `PersonNode` receive a "snapped" zoom (1, 1.3 or 2.2) instead of the real zoom number?
