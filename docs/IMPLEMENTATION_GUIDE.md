# Connectwork — Team Implementation Guide

A step-by-step guide for the two of us to finish the DubHacks '26 build. It picks up where the code is now (M0–M5 done) and walks through every remaining milestone with the files to touch, the code to write, how to test it, and what "done" looks like.

- **Product intent:** the design doc — https://claude.ai/code/artifact/86190765-bb34-4ca1-904e-e58a6bf48a11
- **Exact contracts (types, schemas, endpoints):** [`SPEC.md`](../SPEC.md). If this guide and SPEC.md disagree, SPEC.md wins.
- **Rules for Claude Code if it helps build:** [`CLAUDE.md`](../CLAUDE.md)

---

## 0. Deadlines and how we work

| When | What | Who |
| --- | --- | --- |
| **Sat 10:30 PM PT** | Devpost **draft**: both of us as contributors with Discords, all tracks declared. No draft = no judging. Do it by **9:30 PM**. | Either |
| **Sun 10:00 AM PT** | Devpost **final**: repo, demo video, screenshots, live URL | Both |

Working rules:

1. **One milestone at a time, in order.** Each one leaves the app demoable.
2. After every milestone run the four checks and commit:
   ```bash
   pnpm typecheck && pnpm lint && pnpm test && pnpm build
   git add -A && git commit -m "M<n>: <what it does>"
   ```
3. **Person A** owns the map and UI (filters, flags, drift, list view, calendar UI). **Person B** owns data and AI (routes, prompts, review flows, calendar sync). Never edit the same file at the same time; `App.tsx` and `useStore.ts` are shared, so tell each other before touching them.
4. **Judging is 30% functionality, 30% track fit, 20% design, 20% creativity.** If time runs short, cut from the bottom of the milestone list, never half-finish a feature.

---

## 1. Setup (both of us, 10 minutes)

### 1.1 Tools

```bash
node -v        # needs 20+ (we use 26)
npm install -g pnpm@10
pnpm -v
```

### 1.2 Get the code running

```bash
git clone <repo-url> connectwork && cd connectwork
pnpm install
cp .env.example .env          # then paste GEMINI_API_KEY (see §2)
pnpm seed                     # regenerates demo/ (fake data only)
pnpm dev                      # web on :5173, server on :8787
```

Open http://localhost:5173. You should see the ring map with 40 sample people. The yellow banner says "Demo mode" because the Gemini free tier is in use.

### 1.3 What's already built (M0–M5)

| Area | Where | Notes |
| --- | --- | --- |
| Shared types + AI schemas | `packages/shared/src/types.ts`, `schemas.ts` | Zod schemas are the API contract; add new ones here |
| Local database | `apps/web/src/db/db.ts` (Dexie), `seed.ts`, `materialize.ts`, `actions.ts` | All writes go through `actions.ts` |
| Demo data | `scripts/make-demo-data.ts` → `demo/` | Dates are offsets from today, so the demo never goes stale |
| Ring map | `apps/web/src/graph/layout.ts`, `RingMap.tsx`, `PersonNode.tsx`, `LinkLine.tsx` | Layout settles synchronously; moves animate with CSS |
| Quick add, person card | `components/QuickAdd.tsx`, `PersonCard.tsx`, `PersonReminders.tsx`, `PersonLinks.tsx` | Press `N` |
| CSV import | `lib/csv.ts` (+ tests), `components/ImportDialog.tsx` | LinkedIn + generic, dedupe, fill-empty-only |
| AI query | server `routes/ai.ts`, `gemini.ts`, `prompts.ts`, `cache.ts`; web `AgentBar.tsx`, `AgentAnswer.tsx`, `lib/graphSummary.ts`, `lib/api.ts` | Server tests mock Gemini |
| UI state | `apps/web/src/store/useStore.ts` (Zustand) | Data lives in Dexie, not the store |

### 1.4 Known gotchas (we hit all of these)

| Symptom | Fix |
| --- | --- |
| `pnpm: command not found` | `npm install -g pnpm@10` |
| `typescript-eslint does not support TS 7` | Keep TypeScript pinned to `~6.0.3` in the root `package.json` |
| Browser shows `504 (Outdated Optimize Dep)` or "Invalid hook call" after installing a package | Stop `pnpm dev`, `rm -rf apps/web/node_modules/.vite`, start again |
| Dialog input doesn't get focus | Our dialogs are Base UI: pass `initialFocus={ref}` to `<DialogContent>` instead of `autoFocus` |
| ESLint "Irregular whitespace" | A literal invisible character (e.g. BOM) in source; write it as `﻿` |
| `.env` change not picked up | The server reads `.env` only at start; restart `pnpm dev` |

---

## 2. Human-only setup (do these early, in parallel with coding)

1. **Gemini API key** — Google AI Studio → Get API key → paste into `.env` as `GEMINI_API_KEY=…`. In AI Studio, note the free-tier rate limits for `gemini-3.8-flash` and write them in our team chat. **Free tier = fake data only**, because Google may use free-tier content to improve its products.
2. **Google OAuth client** (for M11) — Google Cloud Console → APIs & Services → enable "Google Calendar API" → OAuth consent screen (External, Testing) → add both our Google accounts as test users → Credentials → Create OAuth client ID → Web application → Authorized JavaScript origins: `http://localhost:5173` and later `https://<our-domain>`. Put the client ID in `.env` as `VITE_GOOGLE_CLIENT_ID=…`. Expect an "unverified app" warning; that's normal for a hackathon.
3. **Vultr VM** (for M13) — claim the MLH credits, create a small Ubuntu 24.04 VM, add your SSH key.
4. **Domain** (for M13) — register via GoDaddy Registry (MLH prize), point an `A` record at the VM's IP.
5. **Devpost draft by 9:30 PM** — both members + Discords, tracks: Cook Smarter (title), DubHacks Next, MLH Commit Fellowship (+ supplemental form), MLH Gemini, MLH Vultr, MLH GoDaddy, SpaceXAI raffle; CloudForce/SideShift after reading the Hacker Guide.

---

## 3. Order of work and split

| # | Milestone | Owner | Est. | Depends on |
| --- | --- | --- | --- | --- |
| M6 | AI auto-sort + hidden links | B | 2 h | M5 |
| M7 | Reminder flags, filter tabs, .ics export | A | 1.5 h | — |
| — | **Devpost draft** | either | 15 min | — |
| M8 | Weekly review agent | B | 2 h | M6 (ReviewSheet) |
| M9 | Snap to add | B | 1.5 h | M6 (ReviewSheet) |
| M10 | Drift + accessible list view | A | 1.5 h | M7 |
| M11 | Google Calendar sync + meeting prep | B (+A for UI) | 2.5 h | OAuth client |
| M12 | Demo hardening (cache record/replay, offline fallback) | B | 1 h | all AI features |
| M13 | Deploy to Vultr + domain | A | 1 h | VM + domain |
| M14 | Month calendar view (only if time) | A | 1 h | M11 |

A and B can run in parallel: A does M7 → M10 → M13 while B does M6 → M8 → M9 → M11 → M12.

---

## 4. Shared refactor before M6 (Person B, 20 minutes)

Every new AI endpoint repeats the same steps as `/query`: validate the request, check the cache, call Gemini with a schema, drop unknown ids, cache the reply, map errors. Pull that into one helper so each new route is ~15 lines.

**File:** `apps/server/src/routes/ai.ts`

1. Add a generic helper below `summaryIds`:

   ```ts
   import type { z } from 'zod';
   import type { Part } from '../gemini';

   interface StructuredRoute<Req, Res> {
     path: string;                                   // e.g. '/classify'
     request: z.ZodType<Req>;
     response: z.ZodType<Res>;
     system: string;
     parts: (body: Req, today: string) => Part[];
     /** Clean the model's reply, e.g. drop unknown ids. */
     post?: (result: Res, body: Req) => Res;
   }

   function structured<Req, Res>(routes: Hono, deps: Deps, r: StructuredRoute<Req, Res>) {
     routes.post(r.path, async (c) => {
       const parsed = r.request.safeParse(await c.req.json().catch(() => null));
       if (!parsed.success) return c.json({ error: 'bad_request', message: 'Invalid request body' }, 400);
       const body = parsed.data;
       const key = cacheKey(`/api/ai${r.path}`, body);
       const cached = deps.cache.get(key);
       if (cached) { c.header('x-cache', 'hit'); return c.json(cached); }
       try {
         if (!deps.generate) throw new AiError('no_api_key', 'GEMINI_API_KEY is not set');
         const today = new Date().toISOString().slice(0, 10);
         const result = await callStructured(deps.generate, { system: r.system, parts: r.parts(body, today), schema: r.response });
         const response = r.post ? r.post(result, body) : result;
         deps.cache.set(key, response);
         c.header('x-cache', 'miss');
         return c.json(response);
       } catch (err) {
         if (err instanceof AiError) return c.json({ error: err.code, message: MESSAGES[err.code] }, STATUS[err.code]);
         throw err;
       }
     });
   }
   ```

2. Rewrite `/query` to use it (behavior must not change):

   ```ts
   structured(routes, deps, {
     path: '/query',
     request: QueryRequest,
     response: QueryResponse,
     system: QUERY_SYSTEM,
     parts: (b, today) => [{ text: `Today is ${today}.\n\nNetwork:\n${b.summary}\n\nQuestion: ${b.question}` }],
     post: (res, b) => {
       const known = summaryIds(b.summary);
       return { ...res, personIds: [...new Set(res.personIds)].filter((id) => known.has(id)) };
     },
   });
   ```

3. Run `pnpm test` — the 7 existing route tests must still pass. That's the proof the refactor is safe.

4. **Move `canonicalJson` to the shared package** (`packages/shared/src/canonical.ts`, export it from `index.ts`) and import it in `apps/server/src/cache.ts`. M12 needs the browser to compute the same cache key.

5. Add a client helper in `apps/web/src/lib/api.ts` so every new endpoint is one line:
   ```ts
   export const aiPost = <T>(path: string, body: unknown, schema: { safeParse: (v: unknown) => { success: boolean; data?: T } }) =>
     post<T>(`/ai${path}`, body, schema);
   ```

Commit: `Refactor: shared structured AI route helper`.

---

## 5. M6 — AI auto-sort + hidden links (Person B)

**Goal:** after an import, one click sorts everyone into rings and tags; a "Find hidden links" button discovers connections like Abbey ↔ John. Both show a review sheet before anything is written.

### 5.1 Schemas — `packages/shared/src/schemas.ts`

```ts
const RingZ = z.union([z.literal(1), z.literal(2), z.literal(3)]);

export const ClassifyRequest = z.object({
  people: z.array(z.object({
    id: z.string(), name: z.string(),
    company: z.string().optional(), role: z.string().optional(),
    school: z.string().optional(), metAt: z.string().optional(),
  })).min(1).max(150),
  tags: z.array(z.string()).min(1),
  userContext: z.string().max(500).optional(),
});
export const ClassifyResponse = z.object({
  items: z.array(z.object({
    id: z.string(), ring: RingZ, primaryTag: z.string(),
    tags: z.array(z.string()).max(4), reason: z.string().max(120),
  })),
});

export const LinksRequest = z.object({ summary: z.string().max(400_000), focusIds: z.array(z.string()).optional() });
export const LinksResponse = z.object({
  links: z.array(z.object({
    fromId: z.string(), toId: z.string(),
    label: z.string().max(60), confidence: z.number().min(0).max(1),
  })).max(15),
});
```

Export the inferred types too (`export type ClassifyRequest = z.infer<…>`).

### 5.2 Prompts — `apps/server/src/prompts.ts`

Add `CLASSIFY_SYSTEM` and `LINKS_SYSTEM`. Key rules to include word for word:

- **Classify:** "Default to ring 3. Suggest ring 2 only with a signal: same company or school as the user context, or met in the last 6 months. Never suggest ring 1 for imported contacts. Choose primaryTag and tags only from the provided list. `reason` says why in under 15 words."
- **Links:** "Only propose a link when the data shows evidence: same company, same school, overlapping dates, or a shared tag like a club. Never propose a link that already appears as an L line. The label must state the evidence, e.g. 'both UW, both Microsoft 2025'. Use only ids in the data. Confidence reflects how strong the evidence is."

Reuse the `DATA_FORMAT` text block already in the file.

### 5.3 Routes — `apps/server/src/routes/ai.ts`

```ts
structured(routes, deps, {
  path: '/classify', request: ClassifyRequest, response: ClassifyResponse, system: CLASSIFY_SYSTEM,
  parts: (b) => [{ text: `Allowed tags: ${b.tags.join(', ')}\nAbout the user: ${b.userContext ?? 'unknown'}\n\nPeople (JSON):\n${JSON.stringify(b.people)}` }],
  post: (res, b) => {
    const ids = new Set(b.people.map((p) => p.id));
    const tags = new Set(b.tags);
    return { items: res.items.filter((i) => ids.has(i.id) && tags.has(i.primaryTag))
      .map((i) => ({ ...i, ring: i.ring === 1 ? 2 : i.ring, tags: i.tags.filter((t) => tags.has(t)) })) };
  },
});

structured(routes, deps, {
  path: '/links', request: LinksRequest, response: LinksResponse, system: LINKS_SYSTEM,
  parts: (b) => [{ text: `Network:\n${b.summary}${b.focusIds?.length ? `\n\nFocus on: ${b.focusIds.join(', ')}` : ''}` }],
  post: (res, b) => {
    const known = summaryIds(b.summary);
    return { links: res.links.filter((l) => l.fromId !== l.toId && known.has(l.fromId) && known.has(l.toId)) };
  },
});
```

Note the classify post-step forces ring 1 → 2 even if the model ignores the rule. Server-side guardrails beat prompt-only rules.

**Tests** (`routes/ai.test.ts`): one test per route with a mocked `generate` that returns a bad id, a ring-1 item and an unknown tag; assert they're dropped or corrected.

### 5.4 Generic review sheet — `apps/web/src/components/ReviewSheet.tsx`

One component used by M6, M8 and M9. It's a right-hand panel listing proposals with a checkbox each, plus **Accept selected** / **Accept all** / **Dismiss**.

1. Add to the store (`useStore.ts`):
   ```ts
   export interface ReviewItem { id: string; title: string; detail?: string; personIds: string[] }
   export interface ReviewPayload { heading: string; items: ReviewItem[]; onAccept: (ids: string[]) => Promise<void> }
   reviewPayload: ReviewPayload | null;
   openReview: (p: ReviewPayload) => void;   // sets rightPanel: 'review'
   closeReview: () => void;
   ```
2. Render it in `App.tsx` where `PersonCard` renders: `rightPanel === 'review'` → `<ReviewSheet />`, `'person'` → `<PersonCard />`.
3. Rows: checkbox (checked by default), title, small grey detail, and hovering a row calls `setHighlights(item.personIds)` so the map shows who it's about.
4. Accept calls `payload.onAccept(selectedIds)`, then toasts "Applied N changes" and closes.

### 5.5 Auto-sort flow — `ImportDialog.tsx` and a new `lib/aiFlows.ts`

1. `applyImport` already returns the new person ids. After import, show the toast with an action: `{ label: 'Sort with AI', onClick: () => sortWithAi(newIds) }`.
2. In `lib/aiFlows.ts`:
   ```ts
   export async function sortWithAi(ids: string[]) {
     const people = (await db.people.bulkGet(ids)).filter(Boolean) as Person[];
     const tags = PRIMARY_TAGS.filter((t) => t !== 'LinkedIn');
     const userContext = (await db.meta.get('userContext'))?.value as string | undefined;
     const items: ClassifyResponse['items'] = [];
     for (let i = 0; i < people.length; i += 150) {          // chunk: max 150 per call
       const chunk = people.slice(i, i + 150).map(({ id, name, company, role, school, metAt }) => ({ id, name, company, role, school, metAt }));
       const res = await aiPost('/classify', { people: chunk, tags, userContext }, ClassifyResponse);
       if (!res.ok) { toast.error(res.message); return; }
       items.push(...res.data.items);
       toast.loading(`Sorted ${Math.min(i + 150, people.length)} of ${people.length}…`, { id: 'sort' });
     }
     toast.dismiss('sort');
     useStore.getState().openReview({
       heading: `Sort ${items.length} imported people`,
       items: items.map((it) => ({ id: it.id, title: `${nameOf(it.id)} → ring ${it.ring}, ${it.primaryTag}`, detail: it.reason, personIds: [it.id] })),
       onAccept: async (accepted) => {
         for (const it of items.filter((x) => accepted.includes(x.id)))
           await updatePerson(it.id, { ring: it.ring, primaryTag: it.primaryTag, tags: [...new Set([it.primaryTag, ...it.tags])] });
       },
     });
   }
   ```
3. Add a **"About you"** textarea to `SettingsDialog.tsx` that saves to `db.meta` key `userContext` ("UW CS junior, interning at Amazon"). It makes sorting much better.

### 5.6 Hidden links flow

1. Add a **"Find hidden links"** button (lucide `Waypoints` icon) to the top bar.
2. Flow in `lib/aiFlows.ts`: build the summary with `buildSummary`, call `/links`, drop `confidence < 0.5`, write each as `upsertLink(a, b, { source: 'ai', status: 'suggested', label })` (already in `db/actions.ts`) so dashed lines appear immediately, then open a ReviewSheet "N possible connections"; Accept → `acceptLink`, unchecked ones → `removeLink`.
3. Person card "Connected to" already shows suggested links with Accept/Reject.

### 5.7 Test it

- Import `demo/Connections.csv` → "Sort with AI" → review sheet lists ~114 rows with reasons → Accept all → the gray band thins out into colored clusters.
- "Find hidden links" → Abbey Chen ↔ John Park appears with an evidence label (both UW, Microsoft). If not, check the John/Abbey rows in the summary and tighten `LINKS_SYSTEM`.
- `pnpm test` passes, including the new route tests.

**Done when:** sorting and link suggestions work live on demo data and nothing changes in Dexie until Accept.

---

## 6. M7 — Reminder flags, filter tabs, .ics export (Person A)

### 6.1 Flags on nodes — `graph/PersonNode.tsx`, `graph/RingMap.tsx`

1. In `App.tsx`, compute and pass two sets to `RingMap`: `dueIds` (already in `filterContext`) and `overdueIds` (use `isOverdue` from `lib/people.ts`).
2. `PersonNode` gets `flag: 'none' | 'due' | 'overdue'`. Draw a small flag at the node's top-right:
   ```tsx
   {flag !== 'none' && (
     <g transform={`translate(${r * 0.7}, ${-r * 0.9})`} aria-hidden="true">
       <line x1={0} y1={0} x2={0} y2={12} stroke="#0f172a" strokeWidth={1.5} />
       <path d="M0 0 L9 3 L0 6 Z" fill={flag === 'overdue' ? '#D55E00' : '#0f172a'} />
     </g>
   )}
   ```
3. Pulse: add to `index.css`
   ```css
   @keyframes cw-pulse { 0%,100% { transform: scale(1) } 50% { transform: scale(1.15) } }
   .cw-pulse { animation: cw-pulse 1.6s ease-in-out infinite; transform-box: fill-box; transform-origin: center; }
   @media (prefers-reduced-motion: reduce) { .cw-pulse { animation: none } }
   ```
   Put `className="cw-pulse"` on the main `<circle>` when `flag !== 'none'`. Respecting reduced motion is part of our accessibility story.
4. Add "follow-up due" / "overdue" to the node's `aria-label`.

### 6.2 Filter tabs — `components/FilterTabs.tsx` (left rail)

1. Vertical list of real `<button>`s with `aria-pressed`: **All**, **Work**, **School**, **Friends**, **Family**, **Clubs**, **Due** (with count badge), **Drifting** (count badge; wire in M10).
2. Clicking sets `useStore.setFilter(...)` and clears AI highlights (highlights override filters in `RingMap`).
3. Layout in `App.tsx`: `<nav className="w-44 shrink-0 border-r bg-background p-2">` to the left of `<main>`. The map already fades non-matching nodes without moving them.

### 6.3 Reminders panel — `components/RemindersPanel.tsx`

When filter is **Due**, show the panel on the right: reminders due within 7 days and overdue, sorted by date, each with **Done**, **Snooze 1 week** (`snoozeReminder` exists in `db/actions.ts`), **Add to calendar** (6.4) and clicking the name selects the person.

### 6.4 .ics export — `lib/ics.ts`

```bash
pnpm --filter @connectwork/web add ics
```

```ts
import { createEvents, type EventAttributes } from 'ics';

const toParts = (iso: string) => iso.split('-').map(Number) as [number, number, number];

export function remindersToIcs(items: Array<{ reminder: Reminder; person: Person }>): string {
  const events: EventAttributes[] = items.map(({ reminder, person }) => ({
    title: `Follow up: ${person.name}`,
    start: toParts(reminder.dueDate),
    duration: { days: 1 },                       // all-day
    description: [reminder.note, person.linkedinUrl].filter(Boolean).join('\n'),
    uid: `${reminder.id}@connectwork`,
  }));
  const { error, value } = createEvents(events);
  if (error || !value) throw error ?? new Error('Could not build calendar file');
  return value;
}

export function downloadIcs(filename: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: 'text/calendar' }));
  const a = Object.assign(document.createElement('a'), { href: url, download: filename });
  a.click();
  URL.revokeObjectURL(url);
}
```

- Add **Add to calendar** to each row in `PersonReminders.tsx` (`connectwork-<name>.ics`) and **Export all reminders** in Settings.
- **Test** `lib/ics.test.ts`: output contains `BEGIN:VCALENDAR` and one `BEGIN:VEVENT` per reminder.

**Done when:** due nodes pulse with a flag (overdue in orange-red), filters fade others without the layout jumping, and the .ics opens in Google/Apple Calendar.

---

## 7. M8 — Weekly review agent (Person B)

This is our Cook Smarter centerpiece: one button, the agent plans, you approve, it does the work.

### 7.1 Candidates, computed in the browser — `lib/weeklyCandidates.ts`

The model shouldn't hunt through the whole network; we hand it a shortlist.

```ts
export type Candidate =
  | { kind: 'follow_up'; personId: string; reminderId: string; dueDate: string; note: string }
  | { kind: 'reconnect'; personId: string; daysSinceContact: number }
  | { kind: 'accept_link'; linkId: string; fromId: string; toId: string; label?: string }
  | { kind: 'intro'; personIds: [string, string]; shared: string };

export function weeklyCandidates(people, links, reminders, now = new Date()): Candidate[]
```

- `follow_up`: undone reminders due within 7 days or overdue.
- `reconnect`: top 10 by drift level (M10's `driftLevel`; until then, `daysSince(lastContact) > 90` for ring 1 and `> 180` for ring 2), ring 1–2 first.
- `accept_link`: links with `status === 'suggested'`.
- `intro`: people tagged `intro` who share a company or school with someone else.

Unit-test it with the seed data: John Park must appear as both `follow_up` and `reconnect`.

### 7.2 Schema, prompt, route

- `WeeklyReviewRequest = { summary, candidates: Candidate[] (as JSON), today }`.
- `WeeklyReviewResponse` exactly as SPEC.md §9.4 (headline, ≤6 actions with `kind`, `personIds`, `title`, `why`, optional `draftMessage`, `reminderDate`).
- `WEEKLY_SYSTEM`: "Pick at most 5–6 highest-value actions from the candidates only. Drafts are short (under 80 words), warm, specific, mention shared context, no emojis, in the user's voice. Never invent events or facts." `post` drops actions whose `personIds` aren't in the summary.

### 7.3 UI — `components/WeeklyReview.tsx`

1. **Review my week** button in the top bar (primary style). Opens the right panel with a loading state ("Looking at your week…").
2. Shows the `headline`, then one card per action: title, why, and if there's a draft, an editable `<textarea>` with **Copy**.
3. Hovering a card highlights its people on the map.
4. **Approve** on a card does all of:
   - `reminderDate` → `addReminder(personId, reminderDate, title)`
   - `accept_link` → `acceptLink(linkId)`
   - draft → copy to clipboard (`navigator.clipboard.writeText`) and toast "Draft copied"
   - offer **Add to calendar** (M7's `.ics`, or M11's Google sync once it exists)
5. **Approve all** runs every card. Approving does **not** change `lastContact`; only "Log contact" does.

**Done when:** the review returns ≤6 actions including John Park, and approving creates reminders, accepts links and gives editable drafts.

---

## 8. M9 — Snap to add (Person B)

### 8.1 Client — `components/SnapDialog.tsx`

1. **Snap** button in the top bar opens a dialog with a file input: `accept="image/*,application/pdf"` and `capture="environment"` so phones open the camera.
2. Downscale images before sending (keeps requests small and fast):
   ```ts
   async function toBase64Jpeg(file: File): Promise<string> {
     const bitmap = await createImageBitmap(file);
     const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
     const canvas = document.createElement('canvas');
     canvas.width = Math.round(bitmap.width * scale);
     canvas.height = Math.round(bitmap.height * scale);
     canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
     const blob = await new Promise<Blob>((r) => canvas.toBlob((b) => r(b!), 'image/jpeg', 0.85));
     return blobToBase64(blob);   // FileReader.readAsDataURL, strip the "data:...;base64," prefix
   }
   ```
   PDFs: send as-is if ≤ 8 MB, otherwise show an error.
3. Show a thumbnail preview and "Reading…" while waiting.

### 8.2 Server

- `ExtractRequest = { file: { mimeType: enum('image/jpeg','image/png','image/webp','application/pdf'), dataBase64: string }, tags: string[] }`; `ExtractResponse` per SPEC.md §9.4.
- Route parts: `[{ inlineData: { mimeType, data: dataBase64 } }, { text: EXTRACT_INSTRUCTION + allowed tags }]`.
- `EXTRACT_SYSTEM`: "Extract every person visible. A business card is one person; a roster or attendee list is every row. Copy text exactly. Leave unknown fields empty. Never guess emails."
- Don't cache-record real photos: skip `deps.cache.set` for this route unless `DEMO_CACHE=record` and the request came from `demo/roster.pdf` (simplest: only record when the base64 matches the demo file's hash).

### 8.3 Review and save

Dedupe each extracted person with `findMatch` from `lib/csv.ts`; existing matches show as "already in your network" (unchecked). Accept → `applyImport({ toAdd, toUpdate: [] }, 'snap', tag)` where the tag is the suggested one if valid, otherwise `Clubs` for multi-person files and `Work` for one business card. Set `lastContact: today` (you just met them).

**Test:** upload `demo/roster.pdf` → 8 people in the review sheet. Photograph any business card with your phone (open the app on your phone over the LAN: run `pnpm --filter @connectwork/web dev --host` alongside the server) → 1 person.

---

## 9. M10 — Drift + accessible list view (Person A)

### 9.1 `lib/drift.ts` (+ `drift.test.ts`)

```ts
export const DEFAULT_THRESHOLDS: Record<Ring, number> = { 1: 90, 2: 180, 3: Infinity };

export function driftLevel(p: Person, now = new Date(), t = DEFAULT_THRESHOLDS): number {
  const limit = t[p.ring];
  if (!p.lastContact || !Number.isFinite(limit)) return 0;
  const days = daysSince(p.lastContact, now);
  return Math.min(1, Math.max(0, (days - limit) / limit));   // 0 fine … 1 = 2× threshold
}
```

Tests: no `lastContact` → 0; exactly at threshold → 0; 2× threshold → 1; ring 3 → always 0.

### 9.2 Wire it into the map

1. In `App.tsx`, compute `driftingIds` (driftLevel > 0) and pass it in `filterContext` (the placeholder `new Set()` is already there).
2. Pass `offsetFor={(p) => driftLevel(p) * 0.06 * Math.min(width, height)}` to `RingMap`. The layout hook already supports `offsetFor`. Easiest: pass a function of `p` and let `RingMap` multiply by its own `base`.
3. In `PersonNode`, set opacity `1 - 0.5 * drift` (unless dimmed) and a dotted outline (`strokeDasharray="2 3"`) when drift > 0.
4. Person card shows "Last contact 7 months ago · drifting" in orange-red when drifting.
5. Settings: two number inputs for ring 1 and ring 2 thresholds, stored in `db.meta` key `driftThresholds`.

### 9.3 List view — `components/ListView.tsx`

1. **Map / List** toggle in the top bar (`useStore.setView`).
2. A real `<table>` with `<caption className="sr-only">`, columns: Name, Ring, Tag, Company, Last contact, Next reminder. Sortable headers are `<button>`s inside `<th>` with `aria-sort`.
3. Uses the same `matchesFilter` and `highlightIds`: highlighted rows get a left accent bar and `aria-selected="true"`. Clicking a row selects the person.
4. Keyboard check: Tab from the agent bar → filters → map nodes / list rows → person card, all without a mouse.

**Done when:** drifting people sit further out and fade, the list mirrors the map with the same filters and highlights, and the whole flow works by keyboard.

---

## 10. M11 — Google Calendar sync + meeting prep (Person B, UI with A)

Needs `VITE_GOOGLE_CLIENT_ID` (§2.2).

### 10.1 Sign-in — `lib/googleCalendar.ts`

1. Add to `apps/web/index.html`: `<script src="https://accounts.google.com/gsi/client" async defer></script>`, and `pnpm --filter @connectwork/web add -D @types/google.accounts`.
2. Token client (token in memory only, never IndexedDB or localStorage):
   ```ts
   let token: string | null = null;
   export function connectCalendar(): Promise<void> {
     return new Promise((resolve, reject) => {
       const client = google.accounts.oauth2.initTokenClient({
         client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
         scope: 'https://www.googleapis.com/auth/calendar.events',
         callback: (resp) => (resp.error ? reject(new Error(resp.error)) : ((token = resp.access_token), resolve())),
       });
       client.requestAccessToken();
     });
   }
   export const isConnected = () => token !== null;
   ```
3. A `gcal(path, init)` helper adds `Authorization: Bearer ${token}`; on 401 set `token = null` and toast "Reconnect Google Calendar".

### 10.2 Read meetings

```
GET https://www.googleapis.com/calendar/v3/calendars/primary/events
    ?timeMin=<today 00:00 ISO>&timeMax=<tomorrow 23:59 ISO>&singleEvents=true&orderBy=startTime
```

Map each event to `Meeting`: match `attendees[].email` (lowercased) to `person.email`, falling back to `displayName` = `person.name`. Save with `db.meetings.bulkPut`. Without a connection, load `demo/calendar-events.json` (offsets from today, like the seed) and label the strip "Sample meetings".

### 10.3 Write reminders as events

```
POST https://www.googleapis.com/calendar/v3/calendars/primary/events
{ "summary": "Follow up: <name>", "description": "<note>", "start": { "date": "<dueDate>" }, "end": { "date": "<dueDate + 1 day>" } }
```

Save the returned `id` into `reminder.calendarEventId`. When connected, "Add to calendar" uses this instead of .ics.

### 10.4 Meeting strip + prep card

1. `components/MeetingStrip.tsx` under the top bar: horizontal chips of today/tomorrow meetings: time, title, matched people's initials.
2. Click → highlight attendees + open `components/MeetingPrepCard.tsx` in the right panel.
3. The card calls `/api/ai/meeting-brief` (schema SPEC.md §9.4; send only the attendees, notes included). It shows the summary, per-person "how you know them" and up to 3 talking points, links between attendees, and their open reminders.
4. **Log this meeting** → `logContact(id, 'meeting')` for each matched attendee, which resets drift.

**Done when:** with Google connected, today's meetings show; clicking one highlights attendees and shows the brief; logging resets drift. Sample meetings work without sign-in.

---

## 11. M12 — Demo hardening (Person B)

1. **Record:** set `DEMO_CACHE=record` in `.env`, restart, run every scripted demo action once (each question we'll ask, sort, links, weekly review, snap the roster PDF, meeting brief). Check `demo/demo-cache.json` grows.
2. **Replay:** set `DEMO_CACHE=replay`, restart. Repeat the actions; the server log shows `cache=hit` and Gemini isn't called.
3. **Offline fallback in the browser:** if `fetch` to `/api` fails, `lib/api.ts` looks the reply up in the bundled `demo/demo-cache.json`:
   ```ts
   import demoCache from '../../../../demo/demo-cache.json';
   import { canonicalJson } from '@connectwork/shared';
   async function cacheKey(route: string, body: unknown) {
     const bytes = new TextEncoder().encode(`${route}\n${canonicalJson(body)}`);
     const hash = await crypto.subtle.digest('SHA-256', bytes);
     return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, '0')).join('');
   }
   ```
   This must produce the same key as the server's `cacheKey`; write a test that compares both for one body.
4. **Gotcha:** the cache key includes the summary, which includes dates relative to today. Record on the morning of judging, with **Reset demo data** first, and don't edit the demo data afterwards.
5. **Test:** stop the server (`Ctrl-C`), keep the web app open, run the demo questions → answers still appear.

---

## 12. M13 — Deploy (Person A)

1. **Build locally:** `pnpm build` → `apps/web/dist`.
2. **On the VM:**
   ```bash
   sudo apt update && sudo apt install -y caddy git
   curl -fsSL https://deb.nodesource.com/setup_22.x | sudo bash - && sudo apt install -y nodejs
   sudo npm install -g pnpm@10
   sudo mkdir -p /srv/connectwork && sudo chown $USER /srv/connectwork
   git clone <repo-url> /srv/connectwork/app && cd /srv/connectwork/app && pnpm install && pnpm build
   cp .env.example .env   # fill GEMINI_API_KEY, ALLOWED_ORIGIN=https://<domain>, DEMO_CACHE=replay
   ```
3. **systemd** — `deploy/connectwork.service`:
   ```ini
   [Unit]
   Description=Connectwork API
   After=network.target
   [Service]
   WorkingDirectory=/srv/connectwork/app/apps/server
   ExecStart=/usr/bin/pnpm start
   Restart=always
   User=www-data
   [Install]
   WantedBy=multi-user.target
   ```
   `sudo cp deploy/connectwork.service /etc/systemd/system/ && sudo systemctl enable --now connectwork`
4. **Caddy** — `deploy/Caddyfile` (Caddy gets HTTPS certificates automatically):
   ```
   <domain> {
     encode gzip
     handle /api/* { reverse_proxy localhost:8787 }
     handle { root * /srv/connectwork/app/apps/web/dist; try_files {path} /index.html; file_server }
   }
   ```
   `sudo cp deploy/Caddyfile /etc/caddy/Caddyfile && sudo systemctl reload caddy`
5. **DNS:** GoDaddy → `A` record `@` → VM IP. Wait a few minutes, then open `https://<domain>`.
6. **Google OAuth:** add `https://<domain>` to the client's Authorized JavaScript origins.
7. **Check:** `curl https://<domain>/api/health` → `{"ok":true,…}`; full demo path works on the live URL.

---

## 13. M14 — Month view (Person A, only if everything else is done)

`components/CalendarMonth.tsx`: a 7-column CSS grid for the current month; each day cell lists reminders and meetings for that date; clicking a day highlights those people. Opened from a **Calendar** filter tab.

---

## 14. Before submitting

### Test checklist (run on the live URL)

- [ ] Fresh browser (incognito): demo seeds, map renders, no console errors
- [ ] `N` → add person in under 10 seconds
- [ ] Import `Connections.csv` → Sort with AI → Accept all
- [ ] "Who do I know at Microsoft?" highlights the right people
- [ ] Find hidden links → Abbey ↔ John
- [ ] Review my week → approve all → reminders and drafts
- [ ] Snap `roster.pdf` → 8 people
- [ ] Meeting strip → prep card → log meeting
- [ ] Filters, Due panel, .ics download
- [ ] List view + full keyboard path
- [ ] Server stopped → cached demo still answers
- [ ] Settings → Reset demo data restores everything

### Submission checklist

- [ ] README: what it is, screenshots, how to run, env vars, tracks, privacy note (local-first; free tier = demo data only)
- [ ] Demo video (2 min): import → sort → ask → hidden link → meeting prep → weekly review
- [ ] Devpost final by **Sun 10:00 AM**, live URL on our domain
- [ ] MLH Commit Fellowship supplemental form
- [ ] No secrets in git: `git log -p | grep -i "api_key"` returns nothing real
- [ ] Switch to Gemini paid tier before anyone imports real contacts
