# CLAUDE.md — Connectwork

Connectwork is a local-first web app that maps a user's personal network as rings and uses a Gemini-powered agent to sort contacts, answer questions, suggest links, read business cards, prep meetings and run a weekly review. Built for DubHacks '26 (Cook Smarter track) by a team of two.

**`SPEC.md` is the source of truth.** Read it fully before writing code. If something here and SPEC.md disagree, SPEC.md wins; if SPEC.md is silent, ask.

## How to work

1. **Build milestones in order** (SPEC.md §15). Do not start a milestone until the previous one meets its acceptance check.
2. After each milestone run `pnpm typecheck && pnpm test && pnpm build`. Fix failures before moving on. Then commit as `M<n>: <summary>`.
3. Keep the app demoable after every commit. Never leave the main screen broken.
4. When a milestone is done, report: what works, what you verified and how, what you skipped.
5. The Devpost draft is due **Saturday 10:30 PM PT**. Around 9:00 PM, stop and remind the human, whatever milestone you're on.

## Scaffold files

Files for M6–M14 already exist as scaffolds: a header comment (WHAT THIS ACHIEVES, HOW IT FITS, STEPS, DONE WHEN) and `TODO(M#) n:` markers where each step goes. Follow the header's steps in order, delete each TODO as you finish it, and keep the existing function signatures. `pnpm todo` lists what's left.

## Hard rules

- **Data stays in the browser.** No server-side database, no storing user data on the server, no logging request bodies. The server only holds the Gemini key, forwards AI calls and serves the demo cache.
- **The model proposes, the user approves.** Never write AI output to Dexie without an Accept step (ReviewSheet / WeeklyReview).
- **Validate every AI response with the Zod schemas** in `packages/shared/src/schemas.ts`, on server and client. Drop items whose person ids are not in the request.
- **Free tier = fake data only.** Never send real personal data while `GEMINI_TIER=free`. Demo data must use clearly fake names.
- **Secrets:** never commit `.env`, keys or tokens. Never expose `GEMINI_API_KEY` to the web bundle. Keep the Google OAuth access token in memory only.
- **Stack is fixed** (SPEC.md §3). Ask before adding a dependency that is not listed there.
- **Out of scope stays out** (SPEC.md §2): no accounts, cloud sync, scraping, Outlook, Muse, payments.
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
