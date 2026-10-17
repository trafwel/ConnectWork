# Connectwork — Architecture (living graph)

**Updated after every milestone.** Green boxes and solid arrows are **built**; dashed gray ones are **planned**; blue boxes are outside services. Each box names its file(s) and the milestone that builds it. GitHub renders these diagrams; in VS Code use a Mermaid preview extension.

**Current state: M4 built** — the demo network is seeded into IndexedDB and drawn as the ring map; clicking a person opens an editable card; N opens Quick add; Import reads a LinkedIn export or any CSV in the browser, previews it, dedupes and writes it in one transaction; every write goes through `db/actions.ts`. Ask Connectwork (M5) and everything after it are scaffolds. Open items: [OPEN_ISSUES.md](OPEN_ISSUES.md). Self-reviews: [REVIEWS.md](REVIEWS.md).

### 1. The big picture

```mermaid
flowchart LR
  Phone(["User's phone"]):::external
  Browser["Browser app<br/><small>all user data lives here</small>"]:::built
  Server["Server<br/><small>Node + Hono · holds the API key, stores nothing</small>"]:::built
  Gemini["Gemini API"]:::external
  GCal["Google Calendar"]:::external
  Photon["Photon 2.0<br/><small>iMessage line</small>"]:::external
  Backboard["Backboard<br/><small>agent chat memory</small>"]:::external
  GitHub["GitHub repo"]:::external
  VEYZL["VEYZL<br/><small>audits each PR</small>"]:::external

  Browser -->|"/api/health · M0"| Server
  Browser -.->|"AI requests · M5+"| Server
  Server -.->|"M5+"| Gemini
  Browser -.->|"direct, token stays in browser · M11"| GCal
  Phone -.-> Photon -.->|"M16"| Server
  Server -.->|"relay texts to the open tab · M16"| Browser
  Server -.->|"conversation only · M17"| Backboard
  GitHub -.->|"every pull request · M15"| VEYZL

  classDef built fill:#e6f2ec,stroke:#2e7d5b,stroke-width:2px,color:#1d2a24;
  classDef planned fill:#f6f7f6,stroke:#9aa39c,stroke-dasharray:5 4,color:#56635b;
  classDef external fill:#eef3f8,stroke:#2f5d8a,color:#1d2a24;
```

### 2. Inside the browser

```mermaid
flowchart LR
  Demo[/"demo/seed.json<br/><small>loaded on demand · M1</small>"/]:::built
  CsvFile[/"CSV file<br/><small>LinkedIn Connections.csv or any CSV · read in the browser</small>"/]:::built
  Csv["CSV logic<br/><small>lib/csv.ts · parse, map, dedupe, plan · M4</small>"]:::built
  Rows["Stored-row schemas (zod)<br/><small>packages/shared/src/storedRows.ts · post-M4</small>"]:::built
  App["App shell<br/><small>App.tsx · M0–M3 · hotkeys N, Escape</small>"]:::built
  Chrome["Top bar · Settings dialog<br/><small>TopBar.tsx, SettingsDialog.tsx · M1</small>"]:::built
  Store["UI state<br/><small>store/useStore.ts · M1</small>"]:::built
  Seed["Seed · reset · delete · export · import<br/><small>db/seed.ts, materialize.ts · M1</small>"]:::built
  DB[("IndexedDB<br/><small>db/db.ts · M1</small>")]:::built
  BackupFile[/"Backup file<br/><small>connectwork-backup-DATE.json</small>"/]:::built
  Actions["Every write<br/><small>db/actions.ts · transactions, link rules · M3</small>"]:::built

  subgraph UI["Screens and panels"]
    direction TB
    Map["Ring map<br/><small>graph/RingMap, PersonNode, LinkLine · M2</small>"]:::built
    Card["Person card · quick add<br/><small>PersonCard, QuickAdd, RingPicker, TagSelect, PersonReminders, PersonLinks · M3</small>"]:::built
    Import["CSV import<br/><small>ImportDialog · lazy-loaded · preview, undo · M4</small>"]:::built
    Ask["Ask Connectwork · M5"]:::planned
    Review["Review sheet · M6"]:::planned
    Weekly["Weekly review · M8"]:::planned
    Snap["Snap to add · M9"]:::planned
  end

  Layout["Ring layout<br/><small>graph/layout.ts · d3-force, settled before paint · M2</small>"]:::built
  Helpers["Pure helpers<br/><small>lib/filters.ts, people.ts, colors.ts · M1–M2</small>"]:::built
  Api["lib/api.ts → server · M5"]:::planned
  Relay["Texting relay client · M16"]:::planned

  App -->|"ensureSeeded() on mount"| Seed
  App -->|"people, links, tags, reminders: useLiveQuery"| DB
  App -->|"props + filterContext"| Map
  Map -->|"positions"| Layout
  Map -->|"matchesFilter, tagColor, initials"| Helpers
  Map -->|"selected, highlights, filter"| Store
  App --> Chrome
  Chrome -->|"settingsOpen, clearFocus"| Store
  Chrome -->|"reset · delete · export · import"| Seed
  Seed <-->|"export (no secrets) / import (confirmed)"| BackupFile
  Seed -->|"validate every row"| Rows
  Demo -->|"dynamic import()"| Seed
  Seed -->|"one transaction per action"| DB
  App -->|"selected person → card"| Card
  Card -->|"select, close"| Store
  Card -->|"read: useLiveQuery"| DB
  Card -->|"every write"| Actions
  Actions -->|"one transaction per rule"| DB
  CsvFile -->|"file.text()"| Import
  Import -->|"parseCsv, planImport"| Csv
  Import -->|"applyImport (one transaction)"| Actions
  Ask -.-> Api
  Review -.-> Api
  Weekly -.-> Api
  Snap -.-> Api
  Relay -.->|"answers from local data"| DB

  classDef built fill:#e6f2ec,stroke:#2e7d5b,stroke-width:2px,color:#1d2a24;
  classDef planned fill:#f6f7f6,stroke:#9aa39c,stroke-dasharray:5 4,color:#56635b;
```

### 3. Inside the server

```mermaid
flowchart LR
  Health["GET /api/health<br/><small>app.ts · M0</small>"]:::built
  Limit["Rate limit<br/><small>rateLimit.ts · M5</small>"]:::planned
  Routes["POST /api/ai/*<br/><small>routes/* · M5–M11</small>"]:::planned
  Helper["Route helper<br/><small>routes/structured.ts · R</small>"]:::planned
  Cache["Demo cache<br/><small>cache.ts · M5/M12</small>"]:::planned
  GeminiH["Gemini helper<br/><small>schema · retry · fallback · gemini.ts · M5</small>"]:::planned
  Prompts["Prompts<br/><small>prompts.ts</small>"]:::planned
  Agent["Texting agent<br/><small>photon/agent.ts · M16</small>"]:::planned
  Hub["Relay hub (SSE)<br/><small>photon/relay.ts · M16</small>"]:::planned
  Gemini["Gemini API"]:::external

  Limit -.-> Routes
  Routes -.-> Helper
  Helper -.-> Cache
  Helper -.-> GeminiH
  Helper -.-> Prompts
  GeminiH -.->|"3.8-flash → 3.6-flash → 3.5-flash-lite"| Gemini
  Agent -.->|"intent"| GeminiH
  Agent -.-> Hub

  classDef built fill:#e6f2ec,stroke:#2e7d5b,stroke-width:2px,color:#1d2a24;
  classDef planned fill:#f6f7f6,stroke:#9aa39c,stroke-dasharray:5 4,color:#56635b;
  classDef external fill:#eef3f8,stroke:#2f5d8a,color:#1d2a24;
```

## Where data lives (privacy at a glance)

| Data | Lives in | Leaves the browser? |
| --- | --- | --- |
| People, links, reminders, notes, settings | IndexedDB in the user's browser (and backup files the user exports, unencrypted) | Only as an opt-in AI request: a compact summary without notes (M5); notes only for a person the user asks about (M8 draft, M11 brief) |
| Gemini API key | Server `.env` | Never reaches the browser |
| Google Calendar token | Browser memory only | Sent only to Google |
| Texts to the agent | Photon → server (in memory) → browser tab | Optional: the conversation (never the network) to Backboard |
| Demo reply cache | `demo/demo-cache.json` | Contains demo data only |

## Milestone status

| Milestone | Parts | Status |
| --- | --- | --- |
| M0 | App shell ↔ `/api/health` | ✅ built |
| M1 | IndexedDB, seeding, UI state, settings | ✅ built ([review](REVIEWS.md#m1)) |
| M2 | Ring map | ✅ built ([review](REVIEWS.md#m2)) |
| M3 | Every write (`actions.ts`), person card, quick add | ✅ built ([review](REVIEWS.md#m3)) |
| M4 | CSV import | ✅ built ([review](REVIEWS.md#m4)) |
| M5 | Ask Connectwork → `/api/ai/query` → Gemini | ⬜ next |
| R, M6 | Route helper; review sheet; classify + links | ⬜ |
| M7–M14 | Flags/filters, weekly review, snap, drift, calendar, demo cache, deploy | ⬜ |
| M15–M17 | VEYZL, Photon texting agent, Backboard | ⬜ |

## Changelog

| Date | Milestone | What changed in the graph |
| --- | --- | --- |
| Oct 17 | — | First version, as three diagrams (big picture, browser, server): M0 built (App ↔ health); everything else planned. |
| Oct 17 | M1 | Browser diagram: demo file, App, top bar + Settings, UI state, seed module and IndexedDB are built; added the backup file and the real arrows (seed on mount, live count, Settings → seed → one transaction per action). Status: M1 ✅, M2 next. |
| Oct 17 | M2 | Browser diagram: ring map built, with its layout (d3-force) and pure helpers as new boxes; App now feeds the map from four live queries; the map reads selection, highlights and filter from the store. Planned UI arrows now start from the person card (M3). Status: M2 ✅, M3 next. |
| Oct 17 | M3 | Browser diagram: `actions.ts` and the person card / quick add are built; App opens the card for the selected person; the card reads live and writes only through `actions.ts`, which writes to IndexedDB in transactions. Planned: CSV import will write through `applyImport`. Status: M3 ✅, M4 next. |
| Oct 17 | M4 | Browser diagram: CSV file, CSV logic (`lib/csv.ts`) and the import dialog are built; the file is read in the browser, planned (dedupe, fill-only) and written through `applyImport` in one transaction. Status: M4 ✅, M5 next. |
| Oct 17 | post-M4 | Open-issues step: added the stored-row schemas that every backup row is checked against; backups carry no secrets and ask before replacing; the import dialog is lazy-loaded and has Undo. |
