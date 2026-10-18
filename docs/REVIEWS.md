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
