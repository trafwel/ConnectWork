# AI Governance & VEYZL Audit Log

**Side track: Best Use of VEYZL.** The challenge: build an AI app, run a VEYZL audit on it, and *show how the findings changed what we shipped*. This file is that evidence. Keep it current — every VEYZL finding gets a row in the log below, with the PR that fixed it.

## M15 — What this achieves

VEYZL audits every pull request against the controls that apply to our AI system (EU AI Act, NIST AI RMF, ISO/IEC 42001) and posts a **VEYZL Audit** check with findings and fix guidance. Connecting it **now, before M6**, means every remaining feature PR (auto-sort, hidden links, weekly review, snap to add, meeting brief, the texting agent) is audited as it's built, and the log below fills up naturally. The demo story becomes: *"VEYZL flagged X, so we shipped Y."*

## Setup (human, ~15 min) — do this first

1. Create a free account at https://veyzl.ai/signup and a project for `trafwel/conNetWork`.
2. Install the VEYZL GitHub App on the repo when the dashboard prompts you.
3. Review the **detected system profile** (the AI surfaces VEYZL found and the controls they trigger). Copy it into "System profile" below.
4. From now on, every milestone goes through a pull request (branch → PR → merge), not a direct push to `main`, so it gets audited. The PR template asks for the VEYZL result.
5. To re-run without a new commit: **Run audit** on the project page.
6. Free plan = advisory (never blocks merges). That's enough for the track; we choose to treat failures as blocking by convention: don't merge a PR with an unaddressed failing control.

## System profile (fill in from VEYZL)

| AI surface | What it does | Data it sees | Human in the loop |
| --- | --- | --- | --- |
| `/api/ai/query` | Answers questions about the user's network; returns ids to highlight | Summary of people (no notes) | User reads the answer; nothing is written |
| `/api/ai/classify` (M6) | Suggests ring and tags for imported contacts | Name, company, role, school, met date | Review sheet; only accepted rows are written |
| `/api/ai/links` (M6) | Suggests people who probably know each other | Network summary | Review sheet |
| `/api/ai/weekly-review` (M8) | Plans follow-ups and drafts messages | Summary + candidate shortlist | User approves each action; drafts are copied, never sent automatically |
| `/api/ai/extract` (M9) | Reads people from a card or roster image/PDF | The image the user chose | Review sheet |
| `/api/ai/meeting-brief` (M11) | Briefs the user on meeting attendees | Attendees' notes, links, reminders | Read-only |
| Texting agent (M16) | Answers texts, adds people, sets reminders via the user's open tab | The text; the browser answers from local data | Only allow-listed senders; additions are reported back in the reply |
| _(VEYZL may list more)_ | | | |

## Safeguards already built in (mention these when a finding asks)

| Area | What we do | Where |
| --- | --- | --- |
| Human oversight | The model proposes; nothing changes until the user accepts | `components/ReviewSheet.tsx`, `WeeklyReview.tsx` |
| Output validation | Every model reply is validated against a zod schema; one retry, then a clear error | `apps/server/src/gemini.ts`, `packages/shared/src/schemas.ts` |
| Hallucination guardrails | Unknown person ids are dropped; values clamped in code (e.g. never ring 1 from classify) | `routes/ai.ts`, route `post()` steps |
| Exactness | Exact lookups computed in code and merged with model answers | `lib/exactMatch.ts` |
| Data minimization | Notes are not sent with queries; only needed fields per endpoint | `lib/graphSummary.ts` |
| Privacy / storage | Local-first (IndexedDB); no server database; no request bodies in logs | `db/db.ts`, `apps/server/src/app.ts` |
| Transparency | Demo banner explains the free tier; answers say what they're based on | `components/DemoBanner.tsx` |
| Prompt injection | Prompts tell the model to treat data as information, not instructions | `apps/server/src/prompts.ts` |
| Robustness | Model fallback, timeouts, rate limit, demo cache | `gemini.ts`, `rateLimit.ts`, `cache.ts` |
| Access control (agent) | Allow-listed senders only; relay requires a token | `apps/server/src/photon/*` |

## Findings log — "how the findings changed what we shipped"

Add a row for every VEYZL finding, including ones we decided not to fix (with the reason).

| Date | PR | Control / framework | Finding (VEYZL's words, short) | What we changed | Status |
| --- | --- | --- | --- | --- | --- |
| _Oct 17_ | _#…_ | _e.g. transparency_ | _e.g. users aren't told replies are AI-generated_ | _e.g. "AI" label on every answer card and texted reply_ | _fixed_ |

## Optional: live audit SDK (`@veyzl/sdk`)

VEYZL's SDK wraps the `@google/genai` client and records prompts and responses for audit evidence. **That sends request content to VEYZL**, so it is wired behind `VEYZL_API_KEY` and must only be used with the fictional demo data — same rule as the Gemini free tier. Scaffold: `apps/server/src/veyzl.ts`.

## For the demo and Devpost

- Screenshot the VEYZL Audit check on a PR, before and after a fix.
- In the video: 10 seconds on one finding and the change it caused.
- Link this file from the Devpost write-up.
