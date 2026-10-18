# conNetWork

**Let Connectwork connect your world.**

Connectwork maps your personal network as rings around you — closest people in the middle, everyone else further out — and an AI agent helps you keep it alive: it sorts imported contacts, answers questions about who you know, spots people who should meet, and plans your follow-ups. Your data never leaves your browser unless you ask the agent something.

Built at **DubHacks '26** for the **Cook Smarter** track (AI agents and planning tools that reduce friction).

> LinkedIn lists your connections. Connectwork shows how they connect to each other, and tells you who to reach out to next.

---

## What it does

| Feature | Status |
| --- | --- |
| Ring map: three rings, tag clusters, level of detail, pan/zoom, keyboard access | 🚧 M2 |
| Quick add (press `N`) and an editable person card with notes, tags, reminders, links | 🚧 M3 |
| LinkedIn `Connections.csv` import (and any CSV), with de-duplication | 🚧 M4 |
| Ask in plain English ("Who do I know at Microsoft?") — answers light up on the map | 🚧 M5 |
| AI auto-sort of imported contacts into rings and tags | 🚧 M6 |
| AI "hidden links": people you know who should know each other | 🚧 M6 |
| Reminder flags, filters, calendar export (.ics) | 🚧 M7 |
| Weekly review agent: plans your follow-ups, you approve, it does the work | 🚧 M8 |
| Snap to add: photo of a business card or a club roster → people | 🚧 M9 |
| Drift: people you haven't talked to in a while fade outward | 🚧 M10 |
| Google Calendar sync and meeting prep | 🚧 M11 |
| Text Connectwork from iMessage (Photon 2.0) — your open tab answers from local data | 🚧 M16 |
| The texting agent remembers the conversation (Backboard) | 🚧 M17 |
| Every pull request audited by VEYZL (EU AI Act, NIST AI RMF, ISO/IEC 42001) — see [AI governance](docs/AI_GOVERNANCE.md) | 🚧 M15 |

## Privacy

- **Local-first.** Everything you add lives in your browser (IndexedDB). There are no accounts and no server-side database.
- **The AI is opt-in.** A compact summary of your network goes to the AI only when you ask something. Notes are not sent with questions.
- **The AI proposes, you decide.** Nothing changes until you accept it.
- **The server stores nothing.** It holds the API key, forwards requests, and never logs request contents.
- **The texting agent asks your browser.** Texts are relayed to your open Connectwork tab, which answers from local data; only allow-listed numbers get replies. Optional Backboard memory stores the text conversation, never your network.
- **Demo builds use Gemini's free tier, which may use requests to improve Google's products — so they run on fictional sample data only.** Use a paid key before importing real contacts.

## Quick start

Requirements: Node 22.13+ (or 24, or 26, which we use) and pnpm 10. Node 20 and the odd-numbered 23/25 don't work with the test tools.

```bash
npm install -g pnpm@10
git clone https://github.com/trafwel/conNetWork.git connectwork
cd connectwork
pnpm install
cp .env.example .env     # add your GEMINI_API_KEY from Google AI Studio
pnpm seed                # generate fictional demo data
git switch m9-snap        # the newest milestone (see below)
pnpm install
pnpm dev                 # app on http://localhost:5173, API on http://localhost:8787/api/…
```

**Which branch?** `main` is still the starting point: it only shows a title and "Server ok". The built milestones are on stacked branches (`m1-data` → … → `m9-snap`, pull requests #2–#11), so use the newest one until they're merged. Opening `localhost:8787` itself shows "404 Not Found"; that's normal, because the server only answers under `/api/` (e.g. `/api/health`).

On the newest branch the app loads a sample network of 40 fictional people on first run. Then try:

1. Press **N** to add someone.
2. **Import** → `demo/Connections.csv` (a fake LinkedIn export).
3. Ask: *"Who do I know at Microsoft?"*, *"Who should I follow up with this week?"*, *"Who have I lost touch with?"*
4. **Settings** → Reset demo data at any time.

Without a Gemini key, everything works except the AI features, which say how to set them up.

## Configuration

| Variable | Default | Purpose |
| --- | --- | --- |
| `GEMINI_API_KEY` | — | Gemini API key (server only, never committed) |
| `GEMINI_MODEL` | `gemini-3.8-flash` | Main model |
| `GEMINI_FALLBACK_MODEL` | `gemini-3.6-flash` | Tried once if the main model is overloaded, slow or rate limited |
| `GEMINI_TIER` | `free` | `free` shows a "sample data only" banner |
| `ALLOWED_ORIGIN` | `http://localhost:5173` | CORS origin |
| `PORT` | `8787` | API port |
| `DEMO_CACHE` | `off` | `record` / `replay` AI replies for offline demos |
| `VITE_GOOGLE_CLIENT_ID` | — | Google Calendar sign-in (coming in M11) |
| `SPECTRUM_PROJECT_ID` / `SPECTRUM_PROJECT_SECRET` | — | Photon texting agent (M16) |
| `AGENT_ALLOWED_SENDERS` / `RELAY_TOKEN` | — | Who may text the agent; the secret linking the server and your open tab |
| `BACKBOARD_API_KEY` / `BACKBOARD_ASSISTANT_ID` | — | Agent conversation memory (M17) |
| `VEYZL_API_KEY` | — | Optional VEYZL live-audit SDK (demo data only) |

## Scripts

| Command | What it does |
| --- | --- |
| `pnpm dev` | Web app and API with hot reload |
| `pnpm seed` | Regenerate `demo/` (deterministic, fictional) |
| `pnpm test` | Unit tests (Vitest) — AI routes are tested with a mocked model |
| `pnpm typecheck` | TypeScript across all packages |
| `pnpm lint` | ESLint |
| `pnpm build` | Production build of the web app |

## How it's built

```
apps/web         React + Vite, Tailwind + shadcn/ui, d3-force ring map, Dexie (IndexedDB), Zustand
apps/server      Node + Hono; Gemini via @google/genai with schema-validated JSON, retry and model fallback
packages/shared  Domain types and zod schemas shared by both apps
scripts/         Demo data generator
demo/            Fictional seed network, LinkedIn-style CSV, club roster PDF, sample meetings
docs/            Implementation guide
```

- The map pins each person to their ring with a radial force and groups them by tag; the layout settles before first paint and animates changes.
- Every AI response is validated against a zod schema, retried once if malformed, and stripped of any person the model invented.
- Exact lookups (company, school) are computed in code and merged with the model's answer, so long lists never drop anyone.

## Docs

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — living architecture graph: what's built and what's planned
- [`docs/GEMINI.md`](docs/GEMINI.md) — how Connectwork uses Gemini, and a recipe for adding AI features
- [`docs/TEST_PLAN.md`](docs/TEST_PLAN.md) — manual test plan (52 tests, M1–M9); interactive checklist in [`docs/testing/`](docs/testing/connectwork-test-run.html)
- [`docs/REVIEWS.md`](docs/REVIEWS.md), [`docs/OPEN_ISSUES.md`](docs/OPEN_ISSUES.md), [`docs/TEACH_BACK.md`](docs/TEACH_BACK.md) — milestone self-reviews, open items, and questions
- [`docs/IMPLEMENTATION_GUIDE.md`](docs/IMPLEMENTATION_GUIDE.md) — step-by-step build guide, M0 to submission
- [`SPEC.md`](SPEC.md) — exact types, schemas, endpoints and milestones
- [`docs/AI_GOVERNANCE.md`](docs/AI_GOVERNANCE.md) — VEYZL audits, safeguards, and how findings changed what we shipped
- [`CLAUDE.md`](CLAUDE.md) — working rules for AI coding assistants on this repo

## DubHacks '26 tracks

Cook Smarter (title track) · Best Use of VEYZL · Photon 2.0 Messaging Agent · DubHacks Next · MLH Commit Fellowship · MLH Best Use of Gemini API · MLH Best Use of Backboard · MLH Best Use of Vultr · MLH Best Domain Name from GoDaddy Registry

## Team

- Luke Prasarttongosoth
- Raio Chea
