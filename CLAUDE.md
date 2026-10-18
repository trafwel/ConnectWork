# CLAUDE.md — Connectwork

Connectwork is a local-first web app that maps a user's personal network as rings and uses a Gemini-powered agent to sort contacts, answer questions, suggest links, read business cards, prep meetings and run a weekly review. Built for DubHacks '26 (Cook Smarter track) by a team of two.

**`SPEC.md` is the source of truth.** Read it fully before writing code. If something here and SPEC.md disagree, SPEC.md wins; if SPEC.md is silent, ask.

## How to work

1. **Build milestones in order** (SPEC.md §15). Do not start a milestone until the previous one meets its acceptance check.
2. After each milestone run `pnpm typecheck && pnpm test && pnpm build`. Fix failures before moving on. Then commit as `M<n>: <summary>`.
3. Keep the app demoable after every commit. Never leave the main screen broken.
4. When a milestone is done, report: what works, what you verified and how, what you skipped.
5. The Devpost draft is due **Saturday 10:30 PM PT**. Around 9:00 PM, stop and remind the human, whatever milestone you're on.

## How we build: one milestone at a time, explained (team rule, Oct 17)

1. **Claude implements ONE milestone (M#) per round** — never two, never "keep going".
2. **Explain the thinking while building, not just the result.** For each file: what problem it solves, the options considered, why this approach, and the concept behind it (e.g. "why IndexedDB instead of localStorage", "why memoize this promise"). Plain language first, then the code.
3. **Self-review after every milestone (before the teach-back), written up for the team in `docs/REVIEWS.md`:**
   - **Efficiency** — wasted work, extra renders, N+1 database calls, things computed twice, oversized payloads.
   - **Integration** — does it work with every piece it touches (store, database, server, other milestones' files, the architecture graph)? Run the app and check, don't assume.
   - **Security & privacy** — data leaving the browser, secrets, injection (prompt, HTML, CSV), unsafe input, logging of personal data.
   - **Other flaws** — edge cases, accessibility, error handling, things the tests don't cover.
   Fix what can be fixed in the same milestone; list the rest as known issues with a reason, and copy every unresolved item into `docs/OPEN_ISSUES.md` (grouped: fix now / waits for a milestone / team decision / won't fix). After the milestone, fix the "fix now" group in a separate step and move those items to Resolved.
4. **Teach-back check before moving on.** At the end of the milestone, summarize the key concepts and write 2–4 short questions into `docs/TEACH_BACK.md` (the team answers them there or in chat). Do NOT start the next milestone until the team says they understand and asks to continue. If an answer shows a gap, explain that concept again (differently) first.
5. **Update the architecture graph** (`docs/ARCHITECTURE.md`) at the end of every milestone: mark what is now built, add new parts and connections, and add a changelog line. The graph must always match the code on the branch.
6. Each milestone lands as its own branch + pull request (so VEYZL audits it); merging and pushing only when the team says so.
7. **Git work goes to a helper agent (team rule, Oct 17).** Commits, pushes, propagating a change up the stacked milestone branches, and opening or updating PRs are delegated to a subagent with exact instructions (branches, files, commit messages, what not to touch). This session writes the code and docs, runs the checks, and then **reviews what the agent did** (`git log`, the diff, the PR) before reporting it as done. Never force-push, never push to `main`, never commit `.env` or the nested `conNetWork/` clone.
8. **CI is real:** `.github/workflows/ci.yml` runs typecheck, lint, tests and build on every PR. A PR is ready only when its checks are green.

## Scaffold files

Files for M1–M17 already exist as scaffolds (M0 is built). When implementing one, follow its header steps: a header comment (WHAT THIS ACHIEVES, HOW IT FITS, STEPS, DONE WHEN) and `TODO(M#) n:` markers where each step goes. Follow the header's steps in order, delete each TODO as you finish it, and keep the existing function signatures. `pnpm todo` lists what's left.

## Hard rules

- **Data stays in the browser.** No server-side database, no storing user data on the server, no logging request bodies. The server only holds the Gemini key, forwards AI calls and serves the demo cache.
- **The model proposes, the user approves.** Never write AI output to Dexie without an Accept step (ReviewSheet / WeeklyReview).
- **Validate every AI response with the Zod schemas** in `packages/shared/src/schemas.ts`, on server and client. Drop items whose person ids are not in the request.
- **Free tier = fake data only.** Never send real personal data while `GEMINI_TIER=free`. Demo data must use clearly fake names.
- **Secrets:** never commit `.env`, keys or tokens. Never expose `GEMINI_API_KEY` to the web bundle. Keep the Google OAuth access token in memory only.
- **Stack is fixed** (SPEC.md §3). Ask before adding a dependency that is not listed there.
- **Out of scope stays out** (SPEC.md §2): no accounts, cloud sync, scraping, Outlook, Muse, payments.
- **Texting agent boundary (M16):** the server relays texts to the open tab; it must never store or cache the network. Only `AGENT_ALLOWED_SENDERS` get replies; never log message text.
- **Backboard boundary (M17):** only the agent conversation goes to Backboard — never people, notes or links.
- **VEYZL (M15):** from M6 on, land every milestone through a pull request and record the VEYZL result (template in `.github/`).
- **Accessibility is a feature:** every map interaction must have a keyboard and list-view equivalent; color is never the only signal.

## Things only the human can do

Stop and ask; do not attempt them yourself (SPEC.md §16): creating API keys or OAuth clients, entering credentials, creating cloud VMs, buying or configuring the domain, billing changes, Devpost submissions, MLH forms. You may write config files (Caddyfile, systemd unit, `.env.example`) and instructions for these steps.

## Commands

```
pnpm install
pnpm seed        # generate demo/ data
pnpm dev         # web :5173 + server :8787
pnpm typecheck
pnpm test
pnpm build
```

Demo cache: set `DEMO_CACHE=record`, run every scripted demo action once, then restart with `DEMO_CACHE=replay`.

## Code style

- TypeScript strict; no `any` in shared types or AI schemas.
- Small components (one file per component in `apps/web/src/components`); data access through Dexie `useLiveQuery`; UI state in the Zustand store.
- Pure logic (CSV parsing, drift, graph summary, ICS, weekly candidates) lives in `apps/web/src/lib` and gets Vitest tests.
- Prompts live only in `apps/server/src/prompts.ts`.
- Comments explain *why*, not *what*.

## Demo story to keep working

Abbey Chen (Microsoft PM, UW) and John Park (UW, interned at Microsoft) are in the seed data but **not linked**. The demo shows: import → AI sort → "Who do I know at Microsoft?" → link suggestion Abbey ↔ John → meeting prep with John → weekly review with John's overdue follow-up. Don't change the seed in a way that breaks this.
