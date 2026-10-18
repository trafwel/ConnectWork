# Connectwork — Architecture (living graph)

**Updated after every milestone.** Green boxes and solid arrows are **built**; dashed gray ones are **planned**; blue boxes are outside services. Each box names its file(s) and the milestone that builds it. GitHub renders these diagrams; in VS Code use a Mermaid preview extension.

**Current state: M12 built**: everything through M11, plus a *demo that survives bad Wi-Fi*. On judging morning the scripted demo's AI answers are recorded ([DEMO_DAY.md](DEMO_DAY.md)); the server replays them, and if the server can't be reached, the browser answers from the same recording. Deploy (M13–M14) and later are scaffolds. Open items: [OPEN_ISSUES.md](OPEN_ISSUES.md).

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
  Browser -->|"POST /api/ai/query · M5 (summary, no notes)"| Server
  Server -->|"structured JSON · M5"| Gemini
  Browser -->|"direct, token in memory only · M11"| GCal
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
  Chrome["Top bar · Settings dialog<br/><small>TopBar.tsx, SettingsDialog.tsx · M1, Appearance S</small>"]:::built
  Look["Appearance<br/><small>lib/appearance.ts + index.css palettes · Neutral/Atlas × System/Light/Dark · S<br/>Reminders: Flag or Ripple · fix 2</small>"]:::built
  LocalPref[/"localStorage<br/><small>cw-appearance (display preference only)</small>"/]:::built
  Store["UI state<br/><small>store/useStore.ts · M1</small>"]:::built
  Seed["Seed · reset · delete · export · import<br/><small>db/seed.ts, materialize.ts · M1</small>"]:::built
  DB[("IndexedDB<br/><small>db/db.ts · M1</small>")]:::built
  BackupFile[/"Backup file<br/><small>connectwork-backup-DATE.json</small>"/]:::built
  Actions["Every write<br/><small>db/actions.ts · transactions, link rules · M3</small>"]:::built

  subgraph UI["Screens and panels"]
    direction TB
    Map["Ring map<br/><small>graph/RingMap, PersonNode, LinkLine · M2<br/>ScreenLabels + labels.ts: no-overlap names, focus, relationship pills · fix 1<br/>Move people: drag or 1/2/3 to change ring, useRingDrag.ts · fix 2</small>"]:::built
    Card["Person card · quick add<br/><small>PersonCard, QuickAdd, RingPicker, TagSelect, PersonReminders, PersonLinks · M3<br/>Add connection, rename a relationship · fix 1</small>"]:::built
    Import["CSV import<br/><small>ImportDialog · lazy-loaded · preview, undo · M4</small>"]:::built
    Ask["Ask Connectwork<br/><small>AgentBar, AgentAnswer, DemoBanner · M5</small>"]:::built
    Review["Review sheet<br/><small>ReviewSheet · AI proposes, you accept · M6</small>"]:::built
    Weekly["Weekly review · Draft a message<br/><small>WeeklyReview, PersonCard · M8</small>"]:::built
    Snap["Snap to add<br/><small>SnapDialog (lazy), lib/image.ts · M9</small>"]:::built
    List["List view<br/><small>ListView · sortable table, same filters + highlights · M10</small>"]:::built
    Meet["Meetings · prep card<br/><small>MeetingStrip, MeetingPrepCard, lib/meetings.ts, googleCalendar.ts · M11</small>"]:::built
  end

  Layout["Ring layout<br/><small>graph/layout.ts · d3-force, settled before paint · M2</small>"]:::built
  Helpers["Pure helpers<br/><small>lib/filters.ts, people.ts, colors.ts · M1–M2</small>"]:::built
  Summary["Summary + guardrails<br/><small>lib/graphSummary.ts, exactMatch.ts · M5<br/>drift.ts + useDriftThresholds: one drift rule for map, list, AI · M10</small>"]:::built
  Api["API client<br/><small>lib/api.ts · typed results, re-validates · M5<br/>offline fallback: lib/offlineCache.ts · M12</small>"]:::built
  Recording[/"Recorded demo answers<br/><small>demo/demo-cache.json · bundled as a lazy chunk · M12</small>"/]:::built
  Relay["Texting relay client · M16"]:::planned

  App -->|"ensureSeeded() on mount"| Seed
  App -->|"people, links, tags, reminders: useLiveQuery"| DB
  App -->|"props + filterContext"| Map
  Map -->|"positions"| Layout
  Map -->|"matchesFilter, tagColor, initials"| Helpers
  Map -->|"selected, highlights, filter"| Store
  App --> Chrome
  Chrome -->|"settingsOpen, clearFocus"| Store
  Chrome -->|"style, mode"| Look
  Look <-->|"saved per device"| LocalPref
  Chrome -->|"reset · delete · export · import"| Seed
  Seed <-->|"export (no secrets) / import (confirmed)"| BackupFile
  Seed -->|"validate every row"| Rows
  Demo -->|"dynamic import()"| Seed
  Seed -->|"one transaction per action"| DB
  App -->|"selected person → card"| Card
  Card -->|"select, close"| Store
  Tabs["Filter tabs · Due panel<br/><small>FilterTabs, RemindersPanel · M7</small>"]:::built
  Ics["Calendar export<br/><small>lib/ics.ts (lazy chunk), addToCalendar · M7<br/>one reminder → Google Calendar when connected · M11</small>"]:::built
  IcsFile[/".ics file<br/><small>opens in Google / Apple / Outlook</small>"/]:::built
  Tabs -->|"setFilter"| Store
  Tabs -->|"Done, Snooze"| Actions
  Tabs -->|"Add to calendar"| Ics
  Card -->|"Add to calendar"| Ics
  Ics --> IcsFile
  App -->|"due / overdue sets → flags; drift levels → offset, fading"| Map
  App -->|"view = list"| List
  Meet -->|"openMeeting: highlights + prep card"| Store
  Meet -->|"replaceMeetings, Log this meeting"| Actions
  Meet -->|"POST /meeting-brief"| Api
  Api -->|"server unreachable or AI down → same key, recorded answer"| Recording
  List -->|"select, sort, filter"| Store
  Chrome -->|"drift limits (DriftSettings)"| Actions
  Card -->|"read: useLiveQuery"| DB
  Card -->|"every write"| Actions
  Actions -->|"one transaction per rule"| DB
  CsvFile -->|"file.text()"| Import
  Import -->|"parseCsv, planImport"| Csv
  Import -->|"applyImport (one transaction)"| Actions
  Ask -->|"buildSummary, ground ids"| Summary
  Ask -->|"askQuery"| Api
  Ask -->|"highlights, answer"| Store
  Flows["AI flows<br/><small>lib/aiFlows.ts · sort, hidden links · M6</small>"]:::built
  Import -->|"Sort with AI"| Flows
  Flows -->|"aiPost /classify, /links"| Api
  Flows -->|"openReview"| Store
  Review -->|"accept → applyClassification, resolveLinks"| Actions
  Cands["Weekly candidates<br/><small>lib/weeklyCandidates.ts · exact shortlist in code · M8</small>"]:::built
  Weekly -->|"candidates"| Cands
  Weekly -->|"aiPost /weekly-review, /draft"| Api
  Weekly -->|"approve → reschedule / add reminder, accept link"| Actions
  Snap -->|"aiPost /extract (≤1600 px JPEG or PDF)"| Api
  Snap -->|"findMatch → openReview"| Store
  Snap -->|"accept → planImport, applyImport"| Actions
  Relay -.->|"answers from local data"| DB

  classDef built fill:#e6f2ec,stroke:#2e7d5b,stroke-width:2px,color:#1d2a24;
  classDef planned fill:#f6f7f6,stroke:#9aa39c,stroke-dasharray:5 4,color:#56635b;
```

### 3. Inside the server

```mermaid
flowchart LR
  Health["GET /api/health<br/><small>app.ts · M0</small>"]:::built
  Limit["Rate limit<br/><small>rateLimit.ts · 30/min per IP · M5</small>"]:::built
  Query["POST /api/ai/query<br/><small>routes/ai.ts · drops invented ids · M5</small>"]:::built
  Classify["POST /api/ai/classify<br/><small>ring 1 → 2, allowed tags only · M6</small>"]:::built
  Links["POST /api/ai/links<br/><small>no self / unknown / existing pairs · M6</small>"]:::built
  WeeklyR["POST /api/ai/weekly-review · /draft<br/><small>actions must match candidates · M8</small>"]:::built
  Extract["POST /api/ai/extract<br/><small>image/PDF → people · only the demo roster cached · M9</small>"]:::built
  Brief["POST /api/ai/meeting-brief<br/><small>known attendees only · ids filtered · M11</small>"]:::built
  Helper["Route helper<br/><small>routes/structured.ts · validate, cache, retry, guardrails, safe errors · R</small>"]:::built
  Cache["Demo cache<br/><small>cache.ts · record / replay · M5 · checked end to end M12</small>"]:::built
  GeminiH["Gemini helper<br/><small>schema · retry · fallback chain · 60 s budget · gemini.ts · M5</small>"]:::built
  Prompts["Prompts<br/><small>prompts.ts · DATA_FORMAT, QUERY done</small>"]:::built
  Agent["Texting agent<br/><small>photon/agent.ts · M16</small>"]:::planned
  Hub["Relay hub (SSE)<br/><small>photon/relay.ts · M16</small>"]:::planned
  Gemini["Gemini API"]:::external

  Limit --> Query
  Limit --> Classify
  Limit --> Links
  Limit --> WeeklyR
  Limit --> Extract
  Limit --> Brief
  Query --> Helper
  Classify --> Helper
  Links --> Helper
  WeeklyR --> Helper
  Extract --> Helper
  Brief --> Helper
  Helper --> Cache
  Helper --> GeminiH
  Helper --> Prompts
  GeminiH -->|"3.8-flash → 3.6-flash → 3.5-flash-lite"| Gemini
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
| M5 | Ask Connectwork → `/api/ai/query` → Gemini | ✅ built ([review](REVIEWS.md#m5)) |
| R, M6 | Route helper; review sheet; classify + links | ✅ built ([review](REVIEWS.md#m6)) |
| S | Style switching (intermediary step, requested Oct 17) | ✅ built ([review](REVIEWS.md#step-s-style-switching)) |
| M7 | Flags, filter tabs, Due panel, .ics | ✅ built ([review](REVIEWS.md#m7)) |
| M8 | Weekly review, Draft a message | ✅ built ([review](REVIEWS.md#m8)) |
| M9 | Snap to add (photo / PDF → people) | ✅ built ([review](REVIEWS.md#m9)) |
| Fix 1 | Map labels (no overlap, zoom-proof), click focus, named connections, Add connection | ✅ built ([review](REVIEWS.md#fix-step-1-map-labels)) |
| Fix 2 | Ripple reminder style, "Move people" edit mode (drag or keys to change ring) | ✅ built ([review](REVIEWS.md#fix-step-2-map-features)) |
| M10 | Drift on the map, drift limits in Settings, list view, keyboard path | ✅ built ([review](REVIEWS.md#m10)) |
| M11 | Google Calendar (browser only), sample meetings, meeting strip, prep card, Log this meeting | ✅ built ([review](REVIEWS.md#m11)) |
| M12 | Demo hardening: record / replay checked, browser offline fallback, DEMO_DAY runbook | ✅ built ([review](REVIEWS.md#m12)) |
| M13–M14 | Deploy | ⬜ |
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
| Oct 17 | M5 | Big picture: browser → server → Gemini is built. Browser: Ask Connectwork, summary + guardrails, API client. Server: rate limit, `/api/ai/query`, demo cache, Gemini helper (fallback chain, 60 s budget) and prompts are built. Status: M5 ✅, R/M6 next. |
| Oct 17 | R + M6 | Server: every AI route goes through the route helper; classify and links are built. Browser: AI flows (sort, hidden links) and the review sheet are built; accepting writes through `actions.ts`. Status: R/M6 ✅, style switching next. |
| Oct 17 | S | Browser: Appearance (style + mode) built; Settings sets it, `localStorage` remembers it per device, and the map's colours come from `--map-*` variables. Status: S ✅, M7 next. |
| Oct 17 | M7 | Browser: filter tabs + Due panel and calendar export (with the .ics file as an output) are built; App feeds due/overdue/drifting sets to the map for flags. Status: M7 ✅, M8 next. |
| Oct 17 | M8 | Browser: weekly review panel + candidates (code) built; approving writes through `actions.ts`. Server: `/weekly-review` and `/draft` on the route helper. Status: M8 ✅, M9 next. |
| Oct 17 | M9 | Browser: Snap dialog (lazy, shares the CSV chunk) + image prep built. Server: `/extract` on the route helper, roster-only caching. Status: M9 ✅, M10 next. |
| Oct 17 | Fix 1 | Browser: the ring map gains a screen-space label layer (`ScreenLabels.tsx` + pure `labels.ts`); the person card can add and rename connections through `actions.ts` (`upsertLink`, new `renameLink`). No new arrows: same store, same database. Status: fix 1 ✅, fix 2 (ripple pulse, drag-to-ring) next. |
| Oct 17 | Fix 2 | Browser: Appearance gains Reminders (Flag/Ripple, an `<html>` attribute + CSS); the ring map gains "Move people" (`useRingDrag.ts`, an `editRings` flag in the UI state), which writes ring changes through `actions.ts` (`updatePerson`). No new arrows. Status: fix 2 ✅, M10 next. |
| Oct 17 | M10 | Browser: new List view box (App → List → UI state); App computes each person's drift once and feeds the map (offset, fading) and list; Settings writes the drift limits through `actions.ts`; Summary + guardrails now names the single drift rule (`drift.ts`, `useDriftThresholds`). Server: `/query` takes optional limits. Status: M10 ✅, M11 next. |
| Oct 17 | M11 | Big picture: browser ↔ Google Calendar is built (direct, token in memory). Browser: new Meetings box (strip + prep card) that opens meetings through the UI state, writes through `actions.ts` and calls `/meeting-brief`; calendar export sends one reminder to Google when connected. Server: `/meeting-brief` replaces the planned "more routes" box. Status: M11 ✅, M12 next. |
| Oct 17 | M12 | Browser: the API client gains an offline fallback to the recorded demo answers (`demo/demo-cache.json`, a lazy chunk), keyed exactly like the server's cache (`cacheKeyAsync` in shared). Server: demo cache unchanged, checked end to end. Status: M12 ✅, M13 next. |
