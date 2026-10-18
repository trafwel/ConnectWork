# Connectwork — Implementation Spec

> *Let Connectwork connect your world.*
> Build spec for the DubHacks '26 prototype (Cook Smarter track). Written so a coding agent (Claude Code) can implement it milestone by milestone. Read `CLAUDE.md` first for working rules.

Source design doc: https://claude.ai/code/artifact/86190765-bb34-4ca1-904e-e58a6bf48a11 (this spec is the authority for implementation details; the design doc is the authority for product intent).

---

## 0. Hard deadlines

| When | What |
| --- | --- |
| Sat Oct 17, 10:30 PM PT | Devpost **draft**: both members + Discords as contributors, all tracks declared. Missing it = no judging. Aim for 9:30 PM. |
| Sun Oct 18, 10:00 AM PT | Devpost **final** submission: repo link, demo video, screenshots, live URL. |

Judging weights: functionality 30%, track fit 30%, design 20%, creativity 20%. Every milestone must leave the app in a demoable state.

---

## 1. Product in one paragraph

Connectwork is a single-screen web app. The user sits at the center of a **ring map**: Ring 1 = closest people, Ring 2 = regular contacts, Ring 3 = everyone else. People are colored by a primary tag and linked to each other. An **AI agent (Gemini)** sorts imported contacts into rings and tags, answers plain-English questions by highlighting the map, suggests hidden links between people, reads business cards and rosters, preps the user for meetings from Google Calendar, and runs a one-click **weekly review** that proposes follow-ups the user approves. All user data stays in the browser (IndexedDB). A thin server only holds the Gemini API key.

---

## 2. Scope

### In scope (priority order — build top to bottom)

| ID | Pri | Feature | Owner |
| --- | --- | --- | --- |
| F1 | P0 | Ring map with seeded demo data | A |
| F2 | P0 | Quick add (press `N`) | A |
| F3 | P0 | LinkedIn `Connections.csv` import | B |
| F4 | P0 | AI plain-English query → highlight on map | B |
| F5 | P1 | AI weekly review (plan → approve → act) | B |
| F6 | P1 | AI snap to add (image/PDF → people) | B |
| F7 | P1 | AI suggested hidden links | B |
| F8 | P1 | AI auto-sort after import (ring + tags) | B |
| F9 | P1 | Reminders as visual flags on nodes | A |
| F10 | P1 | Calendar export (.ics) | A |
| F11 | P1 | Filter tabs | A |
| F12 | P2 | Google Calendar sync + meeting prep | B |
| F13 | P2 | Drift detection | A |
| F14 | P2 | Accessible list view + colorblind-safe palette | A |
| F15 | P2 | Notes per person | A |
| F16 | P3 | Month calendar view (cut first) | A |
| F17 | P1 | VEYZL audit on every PR + governance log (side track) | either |
| F18 | P1 | Photon 2.0 texting agent via browser relay (side track) | B |
| F19 | P2 | Backboard conversation memory for the agent (MLH) | B |

### Out of scope — do not build

Accounts, cloud sync, any server-side database, mobile app, LinkedIn scraping, Outlook calendar, templates gallery, Muse/Meta Model API, company features, payments.

---

## 3. Tech stack (fixed — do not substitute without asking)

| Layer | Choice |
| --- | --- |
| Language | TypeScript (strict) everywhere |
| Monorepo | pnpm workspaces |
| Web app | React + Vite |
| State | Zustand |
| UI | Tailwind CSS + shadcn/ui (Radix primitives) + lucide-react icons |
| Motion | Framer Motion |
| Graph | d3-force (`forceRadial`, `forceCollide`, `forceLink`, `forceX`/`forceY`), rendered as React SVG |
| Storage | Dexie (IndexedDB) |
| CSV | Papa Parse |
| Validation | Zod (shared between web and server) |
| Calendar export | `ics` npm package |
| Calendar sync | Google Identity Services token client (browser) + Google Calendar API v3 via `fetch` |
| AI | Gemini API, model `gemini-3.8-flash`, via `@google/genai` (server only) |
| Server | Node 20+ with Hono (`@hono/node-server`) |
| Hosting | Vultr VM (Ubuntu), Caddy for HTTPS + static files, GoDaddy Registry domain |
| Tests | Vitest; `fake-indexeddb` (dev only) for database tests in Node |
| Lint/format | ESLint + Prettier |

Use the latest stable version of each package at install time. If an SDK API differs from what this spec shows, follow the installed SDK's docs and keep the behavior the same.

---

## 4. Repository layout

```
connectwork/
├── CLAUDE.md
├── SPEC.md
├── README.md
├── package.json                # root scripts: dev, build, typecheck, test, lint, seed
├── pnpm-workspace.yaml
├── .env.example
├── packages/
│   └── shared/
│       ├── package.json        # name: @connectwork/shared
│       └── src/
│           ├── types.ts        # domain types (section 5)
│           ├── schemas.ts      # Zod schemas for AI requests/responses (section 9)
│           └── index.ts
├── apps/
│   ├── web/
│   │   ├── index.html
│   │   ├── vite.config.ts      # dev proxy /api -> http://localhost:8787
│   │   ├── tailwind.config.ts
│   │   └── src/
│   │       ├── main.tsx
│   │       ├── App.tsx                 # layout shell (section 7.1)
│   │       ├── db/
│   │       │   ├── db.ts               # Dexie schema (section 6)
│   │       │   └── seed.ts             # loads demo data on first run
│   │       ├── store/
│   │       │   └── useStore.ts         # Zustand store (section 7.2)
│   │       ├── graph/
│   │       │   ├── layout.ts           # d3-force simulation (section 8)
│   │       │   ├── RingMap.tsx
│   │       │   ├── PersonNode.tsx
│   │       │   └── LinkLine.tsx
│   │       ├── components/
│   │       │   ├── TopBar.tsx          # agent input + buttons
│   │       │   ├── AgentAnswer.tsx
│   │       │   ├── FilterTabs.tsx
│   │       │   ├── PersonCard.tsx
│   │       │   ├── QuickAdd.tsx
│   │       │   ├── ImportDialog.tsx
│   │       │   ├── SnapDialog.tsx
│   │       │   ├── ReviewSheet.tsx     # generic accept/reject list for AI proposals
│   │       │   ├── WeeklyReview.tsx
│   │       │   ├── MeetingStrip.tsx
│   │       │   ├── MeetingPrepCard.tsx
│   │       │   ├── ListView.tsx
│   │       │   ├── RemindersPanel.tsx
│   │       │   ├── SettingsDialog.tsx
│   │       │   └── CalendarMonth.tsx   # P3
│   │       └── lib/
│   │           ├── ids.ts              # nanoid wrapper
│   │           ├── colors.ts           # palette (section 7.6)
│   │           ├── csv.ts              # LinkedIn + generic CSV import (section 10)
│   │           ├── drift.ts            # (section 12)
│   │           ├── graphSummary.ts     # compact text for the model (section 9.2)
│   │           ├── api.ts              # typed client for /api/ai/*
│   │           ├── ics.ts              # (section 11.1)
│   │           └── googleCalendar.ts   # (section 11.2)
│   └── server/
│       ├── package.json
│       └── src/
│           ├── index.ts        # Hono app, CORS, body limit, routes
│           ├── gemini.ts       # one helper: callGemini(...) (section 9.3)
│           ├── prompts.ts      # system instructions per endpoint
│           ├── cache.ts        # demo reply cache (section 9.5)
│           └── routes/ai.ts    # POST /api/ai/* handlers
├── demo/
│   ├── Connections.csv         # generated, fake
│   ├── roster.pdf              # generated, fake club roster
│   ├── calendar-events.json    # fake meetings for offline demo
│   └── demo-cache.json         # recorded AI replies (section 9.5)
└── scripts/
    └── make-demo-data.ts       # generates everything in demo/
```

---

## 5. Domain types (`packages/shared/src/types.ts`)

```ts
export type Ring = 1 | 2 | 3;

export type TagBehavior = 'none' | 'follow-up' | 'intro';

export interface Tag {
  name: string;            // primary key, e.g. "Work"
  color: string;           // hex from palette
  behavior: TagBehavior;
}

export interface Person {
  id: string;              // nanoid(10)
  name: string;
  ring: Ring;
  primaryTag: string;      // Tag.name
  tags: string[];          // secondary tags, may include primaryTag
  company?: string;
  role?: string;
  school?: string;
  email?: string;
  linkedinUrl?: string;
  metAt?: string;          // ISO date
  lastContact?: string;    // ISO date; drives drift
  notes?: string;
  source: 'manual' | 'linkedin' | 'snap' | 'seed';
  createdAt: string;       // ISO datetime
}

export interface Link {
  id: string;
  fromId: string;
  toId: string;
  label?: string;          // e.g. "both UW '24"
  source: 'user' | 'ai';
  status: 'suggested' | 'accepted';
}

export interface Reminder {
  id: string;
  personId: string;
  dueDate: string;         // ISO date
  note: string;
  done: boolean;
  calendarEventId?: string;
}

export interface Meeting {
  id: string;              // Google event id or demo id
  title: string;
  start: string;           // ISO datetime
  end: string;
  attendeeEmails: string[];
  attendeePersonIds: string[];
}

export interface ContactLog {
  id: string;
  personId: string;
  date: string;            // ISO date
  kind: 'meeting' | 'message' | 'other';
  note?: string;
}
```

Rules:
- Links are undirected; store with `fromId < toId` (string compare) and dedupe.
- Updating `lastContact` always also writes a `ContactLog` row.

---

## 6. Local database (`apps/web/src/db/db.ts`)

```ts
import Dexie, { Table } from 'dexie';

export class ConnectworkDB extends Dexie {
  people!: Table<Person, string>;
  links!: Table<Link, string>;
  reminders!: Table<Reminder, string>;
  tags!: Table<Tag, string>;
  meetings!: Table<Meeting, string>;
  contactLogs!: Table<ContactLog, string>;
  meta!: Table<{ key: string; value: unknown }, string>;

  constructor() {
    super('connectwork');
    this.version(1).stores({
      people: 'id, name, ring, primaryTag, company, email, linkedinUrl, lastContact',
      links: 'id, fromId, toId, status',
      reminders: 'id, personId, dueDate, done',
      tags: 'name',
      meetings: 'id, start',
      contactLogs: 'id, personId, date',
      meta: 'key',
    });
  }
}
export const db = new ConnectworkDB();
```

- `seed.ts`: on startup, if `meta['seeded']` is missing, insert default tags (section 7.6) and the demo dataset from `demo/` (import the generated JSON at build time), then set `meta['seeded'] = true`.
- Settings dialog: **Export** (download all tables as one JSON), **Import backup**, **Delete everything** (confirm dialog → `db.delete()` → reload), **Reset demo data**.
- Use `dexie-react-hooks` `useLiveQuery` for reads in components.

---

## 7. Web app

### 7.1 Layout (single screen, desktop-first, works down to 1024px wide)

```
┌───────────────────────────────────────────────────────────────┐
│ TopBar: logo · [Ask Connectwork…        ] · Review my week ·  │
│         Snap · Import · + Add (N) · List/Map toggle · ⚙       │
├───────────────────────────────────────────────────────────────┤
│ MeetingStrip (only if calendar connected or demo meetings)    │
├──────────┬────────────────────────────────────┬───────────────┤
│FilterTabs│            RingMap (SVG)           │ PersonCard /  │
│ All      │                                    │ WeeklyReview /│
│ Work     │                                    │ ReviewSheet / │
│ School   │                                    │ MeetingPrep   │
│ Friends  │                                    │ (right panel, │
│ Due      │                                    │  slides in)   │
│ Drifting │                                    │               │
└──────────┴────────────────────────────────────┴───────────────┘
AgentAnswer: toast-style card under TopBar with the one-line answer
```

### 7.2 Store (`useStore.ts`)

```ts
interface UIState {
  view: 'map' | 'list';
  filter: 'all' | string /* tag name */ | 'due' | 'drifting';
  selectedPersonId: string | null;
  highlightIds: Set<string>;          // from AI query or meeting prep
  rightPanel: null | 'person' | 'weekly' | 'review' | 'meeting';
  reviewPayload: ReviewPayload | null;// what ReviewSheet is showing
  agentAnswer: string | null;
  agentBusy: boolean;
}
```

Data itself is read from Dexie via `useLiveQuery`, not duplicated in the store.

### 7.3 Ring map behavior (F1)

- Center node = "You" (not stored as a Person).
- Ring radii relative to the smaller of SVG width/height: Ring 1 = 0.18, Ring 2 = 0.32, Ring 3 = 0.46. Draw three faint concentric circles with labels "Close", "Regular", "Wider".
- **Level of detail:**
  - Ring 1: radius 22px, initials inside, name label always visible below, primary tag color fill.
  - Ring 2: radius 14px, name label on hover/focus or when zoom ≥ 1.3.
  - Ring 3: radius 6px, no label (tooltip on hover).
- Links: accepted = solid 1px line, 40% opacity; suggested = dashed, accent color, with label on hover.
- Click node → select, open PersonCard. Click empty space → clear selection and highlights.
- Pan + zoom with `d3-zoom` on a `<g>` wrapper (scale 0.5–3).
- **Highlight mode:** when `highlightIds` is non-empty, matching nodes get a 3px accent ring and full opacity; all others drop to 15% opacity. Animate with Framer Motion (200ms).
- **Filters (F11):** non-matching nodes fade to 15% opacity (do not remove; layout must not jump). `due` = has an undone reminder with `dueDate ≤ today + 7 days`. `drifting` = driftLevel > 0 (section 12).

### 7.4 Quick add (F2)

- Global key `N` (ignored while typing in an input) or "+ Add" opens a small dialog.
- Fields: Name (required, autofocus), Ring (1/2/3 segmented control, default 2), Primary tag (select, default "Friends"). Enter saves.
- Saved person: `source: 'manual'`, `lastContact: today`. New node animates in.
- PersonCard lets the user edit everything else later.

### 7.5 PersonCard (F15 + reminders)

Shows and edits: name, ring, primary tag, extra tags (chips, add/remove), company, role, school, email, LinkedIn URL, notes (textarea, autosave on blur), last contact ("Log contact today" button → writes ContactLog + lastContact), reminders (list + "Add reminder" with date + note, each with **Add to calendar** button), links (list of connected people, accepted and suggested with Accept/Reject), **Draft follow-up** button (F5 helper, calls `/api/ai/draft`).

### 7.6 Palette and tags (F14)

Okabe-Ito colorblind-safe palette. Default tags:

| Tag | Color | Behavior |
| --- | --- | --- |
| Work | `#0072B2` | none |
| School | `#E69F00` | none |
| Friends | `#009E73` | none |
| Family | `#CC79A7` | none |
| Clubs | `#56B4E9` | none |
| LinkedIn | `#8C8C8C` | none (unsorted imports) |
| follow-up | `#D55E00` | follow-up |
| intro | `#F0E442` | intro |

Color is never the only signal: tag name shows on hover/focus and in the list view.

### 7.7 Reminder flags (F9)

- A node whose person has an undone reminder due within 7 days shows a small flag icon at top-right and pulses (scale 1 → 1.15 → 1, 1.6s loop).
- Overdue: flag turns `#D55E00`.
- RemindersPanel (opened from the "Due" filter) lists due reminders sorted by date with Done / Snooze 1 week / Add to calendar.
- Tag with behavior `follow-up`: adding this tag to a person with no reminder auto-creates a reminder due in 7 days.

### 7.8 Accessible list view (F14)

- Toggle Map/List in TopBar. List view = table: Name, Ring, Primary tag, Company, Last contact, Next reminder. Sortable headers, same filters and highlights (highlighted rows get a left accent bar and `aria-selected`).
- Map nodes are focusable (`tabIndex=0`, `role="button"`, `aria-label="{name}, ring {n}, {tag}"`); Enter opens PersonCard.
- Agent answers are rendered as text in an `aria-live="polite"` region.
- All dialogs use shadcn/Radix Dialog (focus trap, Escape to close).

---

## 8. Graph layout (`apps/web/src/graph/layout.ts`)

```ts
// Inputs: people, accepted+suggested links, width, height
// Output: positions {id -> {x,y}} updated on each tick (throttle React updates to rAF)
const cx = width / 2, cy = height / 2;
const base = Math.min(width, height);
const ringR = { 1: 0.18 * base, 2: 0.32 * base, 3: 0.46 * base };

// Tag sectors: each primary tag gets an angle so same-tag people cluster.
// angle = (index of tag in sorted tag list / tagCount) * 2π
const target = (p) => {
  const r = ringR[p.ring] + driftOffset(p);           // section 12
  const a = sectorAngle(p.primaryTag);
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
};

simulation
  .force('radial', d3.forceRadial(p => ringR[p.ring] + driftOffset(p), cx, cy).strength(0.9))
  .force('x', d3.forceX(p => target(p).x).strength(0.06))
  .force('y', d3.forceY(p => target(p).y).strength(0.06))
  .force('collide', d3.forceCollide(p => nodeRadius(p.ring) + 3))
  .force('link', d3.forceLink(links).id(d => d.id).strength(0.02))
  .alphaDecay(0.05);
```

- Re-run with low alpha (0.3) when people/rings change; do not restart from random positions (keep previous x/y).
- Above ~300 nodes, switch rendering to `<canvas>` (stretch; not required for the demo).

---

## 9. AI layer

### 9.1 Principles

1. **Data stays in the browser.** The browser builds a compact summary and sends it with each request. The server is stateless.
2. **The model proposes; the user disposes.** Every AI output that would change data is shown in a ReviewSheet with per-item Accept/Reject and "Accept all". Only accepted items are written to Dexie.
3. **Every response is validated with Zod** on the server (reject + retry once on failure) and again on the client.
4. **Every person id in a response must exist** in the request's summary; drop items with unknown ids.
5. **Free tier = fake data only.** While `GEMINI_TIER=free`, the web app shows a small banner "Demo mode: use sample data only".

### 9.2 Graph summary (`lib/graphSummary.ts`)

One line per person, ids short and stable:

```
id|name|ring|primaryTag|tags|company|role|school|lastContact|metAt
p_8f3k2a|Abbey Chen|2|Work|Work,UW|Microsoft|PM|University of Washington|2026-08-01|2025-06-12
```

Plus links: `L|p_8f3k2a|p_x91mq0|both UW '24` and due reminders: `R|p_8f3k2a|2026-10-20|follow up after career fair`.
Notes are **not** included unless the endpoint says so (draft, meeting brief: only for the people involved).

### 9.3 Server Gemini helper (`apps/server/src/gemini.ts`)

```ts
import { GoogleGenAI } from '@google/genai';
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

export async function callGemini<T>(opts: {
  system: string;
  userParts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }>;
  jsonSchema: object;          // JSON Schema generated from the Zod schema (zod-to-json-schema)
  zod: z.ZodType<T>;
}): Promise<T> {
  const res = await ai.models.generateContent({
    model: process.env.GEMINI_MODEL ?? 'gemini-3.8-flash',
    contents: [{ role: 'user', parts: opts.userParts }],
    config: {
      systemInstruction: opts.system,
      responseMimeType: 'application/json',
      responseJsonSchema: opts.jsonSchema, // if the installed SDK lacks this field, use responseSchema
      temperature: 0.3,
    },
  });
  const parsed = opts.zod.safeParse(JSON.parse(res.text ?? '{}'));
  if (!parsed.success) throw new AiFormatError(parsed.error);
  return parsed.data;
}
```

- On `AiFormatError`: retry once with an extra user part "Your previous reply did not match the schema: {errors}. Reply again with valid JSON only."
- On HTTP 429: return 503 `{error:'rate_limited'}` to the client; the client shows "The agent is busy, try again in a minute" and (in demo mode) falls back to cache.
- Timeout: 30s per call.

### 9.4 Endpoints (`apps/server/src/routes/ai.ts`)

All are `POST`, JSON in/out, body limit 10 MB, CORS restricted to `ALLOWED_ORIGIN`. Shared Zod schemas live in `packages/shared/src/schemas.ts`.

#### `POST /api/ai/query` — F4

Request: `{ question: string, summary: string }`
Response:
```ts
z.object({
  answer: z.string().max(400),          // one or two sentences
  personIds: z.array(z.string()).max(50),
  filterHint: z.enum(['none','due','drifting']).default('none'),
})
```
System instruction (prompts.ts):
> You are Connectwork's network assistant. You receive the user's network as pipe-separated lines (P = people header row, L = links, R = reminders) and a question. Answer in at most two sentences. Return the ids of every person the answer refers to in personIds. Only use ids that appear in the data. If nobody matches, say so and return an empty list. Never invent people, companies or facts.

Client: set `agentAnswer`, `highlightIds`; if one person, also select them.

#### `POST /api/ai/classify` — F8

Request: `{ people: Array<{id,name,company?,role?,school?,metAt?}>, tags: string[], userContext?: string }` (batch ≤ 150; client chunks larger imports).
Response:
```ts
z.object({ items: z.array(z.object({
  id: z.string(),
  ring: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  primaryTag: z.string(),
  tags: z.array(z.string()).max(4),
  reason: z.string().max(120),
})) })
```
Instruction essentials: default to ring 3; only suggest ring 2 when there is a signal (same company/school as `userContext`, recent `metAt`); never suggest ring 1 for imported contacts; choose tags only from the provided list.
`userContext` = optional free text from Settings ("I'm a UW CS student, interning at Amazon").
Client: show ReviewSheet ("Sort 128 imported people") with Accept all / per-row edits.

#### `POST /api/ai/links` — F7

Request: `{ summary: string, focusIds?: string[] }`
Response:
```ts
z.object({ links: z.array(z.object({
  fromId: z.string(), toId: z.string(),
  label: z.string().max(60),        // e.g. "both UW '24, both interned at Amazon"
  confidence: z.number().min(0).max(1),
})).max(15) })
```
Instruction: only propose links supported by shared company, school, overlapping dates or explicit notes; never between people already linked; label must state the evidence.
Client: drop confidence < 0.5; write accepted-by-user ones as `status:'accepted'`; show the rest as dashed `suggested` lines until accepted/rejected.

#### `POST /api/ai/weekly-review` — F5

The **client** first computes candidates deterministically, then the model prioritizes and writes copy:

```ts
// client side, lib/weeklyCandidates.ts
candidates = [
  ...dueReminders(next 7 days + overdue),
  ...drifting(people with driftLevel > 0.3, top 10 by driftLevel, ring 1-2 first),
  ...suggestedLinksPendingReview,
  ...introOpportunities(people tagged 'intro' who share a company/school with someone else),
]
```
Request: `{ summary: string, candidates: Candidate[], today: string }`
Response:
```ts
z.object({
  headline: z.string().max(140),   // "3 people to reconnect with, 2 follow-ups due"
  actions: z.array(z.object({
    kind: z.enum(['reconnect','follow_up','accept_link','intro']),
    personIds: z.array(z.string()).min(1).max(2),
    title: z.string().max(80),      // "Reconnect with Priya"
    why: z.string().max(160),
    draftMessage: z.string().max(600).optional(),
    reminderDate: z.string().optional(), // ISO date
  })).max(6),
})
```
Instruction: pick at most 5–6 highest-value actions; drafts are short, warm, specific (mention shared context), in the user's voice, no emojis; never invent events.
Client (WeeklyReview panel): checklist of actions; hovering an action highlights its people; **Approve** on an action does all of: create Reminder (if `reminderDate`), copy draft to clipboard + show it editable, accept link (for `accept_link`), and offer "Add to calendar". **Approve all** does every action. Approved reconnect/follow-up actions do **not** change `lastContact` (only logging real contact does).

#### `POST /api/ai/extract` — F6

Request: `{ file: { mimeType: 'image/jpeg'|'image/png'|'image/webp'|'application/pdf', dataBase64: string }, tags: string[] }` (client downscales images to ≤ 1600px long edge, JPEG quality 0.85; PDFs ≤ 8 MB).
Response:
```ts
z.object({ people: z.array(z.object({
  name: z.string(),
  company: z.string().optional(), role: z.string().optional(),
  school: z.string().optional(), email: z.string().optional(),
  linkedinUrl: z.string().optional(),
  suggestedTag: z.string().optional(),
})).max(200) })
```
Send the file as an `inlineData` part plus a text part with the instruction: extract every person visible (business card = 1 person; roster/attendee list = all rows); copy text exactly; leave unknown fields empty; do not guess emails.
Client: dedupe against existing people (section 10.3), show ReviewSheet; accepted people get `source:'snap'`, `ring: 3`, `lastContact: today`, and `primaryTag` = `suggestedTag` if it is a known tag, else `'Clubs'` for multi-person files and `'Work'` for a single business card.

#### `POST /api/ai/draft` — F5 helper

Request: `{ person: PersonSummaryWithNotes, sharedConnections: string[], purpose?: string }`
Response: `z.object({ message: z.string().max(800) })`

#### `POST /api/ai/meeting-brief` — F12

Request: `{ meeting: {title,start}, attendees: PersonSummaryWithNotes[], links: string[], reminders: string[] }`
Response:
```ts
z.object({
  summary: z.string().max(300),
  perPerson: z.array(z.object({
    personId: z.string(),
    howYouKnow: z.string().max(140),
    talkingPoints: z.array(z.string().max(120)).max(3),
  })),
})
```

#### `GET /api/health` → `{ ok: true, model, tier, cache: 'off'|'record'|'replay' }`

### 9.5 Demo reply cache (`apps/server/src/cache.ts`)

- Env `DEMO_CACHE=off|record|replay` (default `off`).
- Key = sha256 of `route + canonical JSON body`.
- `record`: after a successful Gemini reply, write `{key: response}` into `demo/demo-cache.json`.
- `replay`: if key exists, return cached response immediately (add header `x-cache: hit`); otherwise call Gemini normally.
- Before judging: run every scripted demo action once with `record`, then restart in `replay`.
- The web app also ships `demo-cache.json` and uses it **client-side** if `/api` is unreachable (Wi-Fi failure). Match on the same key.

---

## 10. Import (F3)

### 10.1 LinkedIn `Connections.csv`

- LinkedIn's export starts with a few "Notes:" lines before the header. Skip lines until one starts with `First Name,`.
- Expected header: `First Name,Last Name,URL,Email Address,Company,Position,Connected On`. Match columns by name (case-insensitive), not position.
- Mapping: name = `First Name + ' ' + Last Name` (trimmed), `linkedinUrl` = URL, `email` = Email Address (often blank), `company`, `role` = Position, `metAt` = Connected On parsed from `DD Mon YYYY` (e.g. `15 Oct 2024`) to ISO; unparseable → undefined.
- Defaults: `ring: 3`, `primaryTag: 'LinkedIn'`, `tags: ['LinkedIn']`, `source: 'linkedin'`, `lastContact: metAt`.

### 10.2 Generic CSV

ImportDialog shows a column-mapping step when headers don't match LinkedIn: dropdown per field (name required; company, role, school, email, tags [semicolon-separated], ring).

### 10.3 Dedupe

Match existing person by (1) normalized `linkedinUrl`, else (2) lowercase name + lowercase company, else (3) lowercase email. Matches update empty fields only; never overwrite user edits.

### 10.4 After import

Toast: "Imported 312 people · Sort them with AI?" → runs `/api/ai/classify` in chunks of 150 with a progress bar → ReviewSheet.

### 10.5 Tests (Vitest)

`csv.test.ts`: notes lines skipped; header matched case-insensitively; date parsing; dedupe rules; generic mapping.

`db/actions.test.ts`: every write rule against a real (in-memory) IndexedDB via `fake-indexeddb/auto`, imported first so Dexie runs unchanged. Covers defaults, blank names, primary tag kept in tags, follow-up reminder (once), transaction rollback, delete cleanup, contact logs, reminders, and link rules (normalized, no self/missing, never downgrade).

---

## 11. Calendar

### 11.1 Export (F10) — `lib/ics.ts`

- `reminderToIcs(reminder, person)` → all-day event on `dueDate`, title `Follow up: {name}`, description = reminder note + LinkedIn URL if any.
- "Add to calendar" downloads `connectwork-{name}.ics`; Settings → "Export all reminders" downloads one `.ics` with every undone reminder.
- Use the `ics` package (`createEvents`). Test: generated file contains `BEGIN:VCALENDAR` and one `VEVENT` per reminder.

### 11.2 Google Calendar sync (F12) — `lib/googleCalendar.ts`

- Load `https://accounts.google.com/gsi/client` in `index.html`.
- Token client:
  ```ts
  const tokenClient = google.accounts.oauth2.initTokenClient({
    client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
    scope: 'https://www.googleapis.com/auth/calendar.events',
    callback: (resp) => { /* keep resp.access_token in memory only */ },
  });
  tokenClient.requestAccessToken();
  ```
- Keep the access token **in memory only** (not IndexedDB, not localStorage). On 401, ask the user to reconnect.
- Read meetings (today + tomorrow):
  `GET https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=…&timeMax=…&singleEvents=true&orderBy=startTime`
  Map `attendees[].email` → people by `email` (exact, lowercase). Also try matching attendee `displayName` to person `name`. Store as `Meeting` rows.
- Write reminder as event:
  `POST https://www.googleapis.com/calendar/v3/calendars/primary/events` with `{ summary: 'Follow up: {name}', description, start:{date}, end:{date: dueDate+1} }`; save returned `id` into `reminder.calendarEventId`. Completing a reminder does not delete the event (stretch: PATCH it).
- **Demo fallback:** if not connected, MeetingStrip shows meetings from `demo/calendar-events.json` labelled "Sample meetings".

### 11.3 Meeting strip + prep (F12)

- MeetingStrip: horizontal list of today/tomorrow meetings: time, title, attendee avatars (matched people only).
- Click → highlight attendees on map + open MeetingPrepCard → calls `/api/ai/meeting-brief` with only those attendees (notes included) → shows summary, per-person "how you know them" and talking points, shared links between attendees, open reminders.
- Button "Log this meeting" → ContactLog for each matched attendee + update `lastContact` (resets drift).

### 11.4 Month view (F16, P3 — only if everything else is done)

Simple 7-column grid for the current month; each day lists reminders and meetings; clicking a day highlights those people.

---

## 12. Drift (F13) — `lib/drift.ts`

```ts
const THRESHOLD_DAYS = { 1: 90, 2: 180, 3: Infinity };
export function driftLevel(p: Person, today: Date): number {
  const t = THRESHOLD_DAYS[p.ring];
  if (!p.lastContact || t === Infinity) return 0;
  const days = daysBetween(p.lastContact, today);
  return clamp((days - t) / t, 0, 1);   // 0 = fine, 1 = 2x threshold
}
export const driftOffset = (p) => driftLevel(p, today) * 0.06 * base; // px outward
export const driftOpacity = (p) => 1 - 0.5 * driftLevel(p, today);
```

- Thresholds editable in Settings.
- Drifting nodes get a subtle dotted outline; PersonCard shows "Last contact 7 months ago".
- Unit tests for boundary cases (no lastContact, exactly at threshold, 2× threshold, ring 3).

---

## 13. Demo data (`scripts/make-demo-data.ts`, run with `pnpm seed`)

Deterministic (fixed random seed). Produces:

1. `demo/Connections.csv` — ~120 fake LinkedIn rows with the real header and 3 leading "Notes:" lines. Companies: Microsoft, Amazon, Google, Expedia, T-Mobile, Salesforce, a few startups. Schools: University of Washington, Seattle University, UBC.
2. `demo/seed.json` — ~27 hand-sorted people (8 in ring 1, 14 in ring 2, 5 in ring 3; cut from 40 for the demo, Oct 18) for the first-run map, including the story pair:
   - **Abbey Chen** — Work, ring 2, Microsoft PM, University of Washington, connected 2025-06.
   - **John Park** — School, ring 2, University of Washington, interned at Microsoft summer 2025, `lastContact` 7 months ago (drifting), reminder "follow up after career fair" due tomorrow.
   - They are **not** linked, so `/api/ai/links` should discover them.
   - 3 people tagged `intro`; 2 overdue reminders; 4 drifting ring-1/2 people.
3. `demo/roster.pdf` — a one-page "UW Data Science Club — Fall 2026 officers" table with 8 fake names, roles, emails (use `pdf-lib`).
4. `demo/calendar-events.json` — 3 meetings today/tomorrow; one includes John Park's email and one Abbey Chen's.

All names must be clearly fake; no real people.

---

## 14. Server, config and deployment

### 14.1 Environment

`.env.example`:
```
# server
GEMINI_API_KEY=
GEMINI_MODEL=gemini-3.8-flash
GEMINI_TIER=free            # free | paid  (free => demo data only banner)
ALLOWED_ORIGIN=http://localhost:5173
PORT=8787
DEMO_CACHE=off              # off | record | replay

# web (Vite)
VITE_API_BASE=/api
VITE_GOOGLE_CLIENT_ID=
```
Never commit `.env`. The web app never sees `GEMINI_API_KEY`.

### 14.2 Server rules

- Hono app: `cors({ origin: ALLOWED_ORIGIN })`, body limit 10 MB, JSON error handler `{error: code, message}`.
- Do **not** log request bodies. Log route, status, latency, cache hit/miss only.
- Simple in-memory rate limit: 30 requests/minute per IP.

### 14.3 Scripts (root `package.json`)

```
dev        -> runs web (vite, :5173) and server (tsx watch, :8787) together
build      -> builds shared, web (to apps/web/dist), server
typecheck  -> tsc --noEmit in every package
test       -> vitest run
lint       -> eslint .
seed       -> tsx scripts/make-demo-data.ts
```

### 14.4 Deployment (human does account/payment steps; Claude can write the configs)

- Vultr Ubuntu VM, Node 20+, run server with `systemd` (unit file in `deploy/connectwork.service`).
- Caddy (`deploy/Caddyfile`):
  ```
  connectwork.example {
    encode gzip
    handle /api/* { reverse_proxy localhost:8787 }
    handle { root * /srv/connectwork/web; try_files {path} /index.html; file_server }
  }
  ```
- GoDaddy Registry domain → A record to the VM IP.
- Google Cloud OAuth client (Web): authorized JavaScript origins = `https://<domain>` and `http://localhost:5173`; publishing status Testing; add both team members' Google accounts as test users. Expect the "unverified app" warning.

---

## 15. Milestones and acceptance checks

Build in order. After each milestone: `pnpm typecheck && pnpm test && pnpm build` must pass, then commit `M<n>: <summary>`.

| # | Milestone | Done when (acceptance) |
| --- | --- | --- |
| M0 | Scaffold | `pnpm dev` serves a blank app at :5173 and `GET /api/health` returns ok via the Vite proxy. Tailwind + shadcn working. |
| M1 | Data + seed | `pnpm seed` writes `demo/*`. First load seeds Dexie; reload keeps data; Settings → Delete everything clears it. |
| M2 | Ring map (F1) | Seed renders in 3 rings, clustered by tag, no node overlap, pan/zoom works, click opens PersonCard. |
| M3 | Quick add + PersonCard (F2, F15) | `N` → type name → Enter adds a node in under 10 s; card edits persist after reload. |
| M4 | CSV import (F3) | Importing `demo/Connections.csv` adds ~6 people to ring 3 (export cut from ~120 to 12 rows and the seed to 27 people for the demo, Oct 18); re-import adds 0 (dedupe); `csv.test.ts` passes. |
| M5 | AI query (F4) | "Who do I know at Microsoft?" returns a sentence and highlights exactly the Microsoft people; unknown ids are dropped; 429 shows a friendly message. |
| — | **Devpost draft** | Submit draft by 9:30 PM Saturday regardless of progress. |
| M6 | Auto-sort + links (F8, F7) | After import, "Sort with AI" shows a ReviewSheet; Accept all updates rings/tags. Links suggestion finds Abbey ↔ John with an evidence label. |
| M7 | Reminders + filters + .ics (F9, F11, F10) | Due nodes pulse with a flag; filters fade others without layout jumps; .ics opens in Google/Apple Calendar. |
| M8 | Weekly review (F5) | "Review my week" returns ≤ 6 actions incl. John Park; Approve creates reminders, shows editable drafts, accepts links. |
| M9 | Snap to add (F6) | Uploading `demo/roster.pdf` yields 8 people in a ReviewSheet; a phone photo of a business card yields 1. |
| M10 | Drift + accessibility (F13, F14) | Drifting people sit further out and fade; list view mirrors map with filters/highlights; full keyboard path works; palette per 7.6. |
| M11 | Calendar sync + meeting prep (F12) | With Google connected, today's meetings appear; clicking one highlights attendees and shows the brief; "Log this meeting" resets drift. Demo meetings work without sign-in. |
| M12 | Demo hardening | `DEMO_CACHE=record` run of all scripted actions; `replay` mode verified; client-side cache fallback verified with server stopped. |
| M13 | Deploy | Live at the domain over HTTPS; Google sign-in works from the domain. |
| M14 | Month view (F16) | Only if time remains. |
| M15 | VEYZL (F17) | GitHub App installed; every later milestone merged via PR with a VEYZL result; `docs/AI_GOVERNANCE.md` findings log has entries. Set up BEFORE M6. |
| M16 | Texting agent (F18) | Live on iMessage via spectrum-ts; texts relayed over SSE to the open tab, answered from IndexedDB; allow-listed senders only; replies signed "— Connectwork (AI)"; tab closed → polite message. |
| M17 | Agent memory (F19) | Backboard stores only the agent conversation; pronouns resolve across texts; fails soft when off. |

---

## 15a. Side tracks (M15–M17)

- **Relay architecture (M16).** The server never holds the network. `apps/server/src/photon/agent.ts` (spectrum-ts loop) parses each allowed text into an `AgentIntent` (Gemini, `INTENT_SYSTEM`), then `photon/relay.ts` forwards a `RelayRequest` over Server-Sent Events (`GET /api/relay/stream`, token-protected) to the open tab; the tab (`web/lib/relayClient.ts`) answers from IndexedDB and `POST /api/relay/reply`s a `RelayReply`. `POST /api/relay/notify` lets the tab text the owner (weekly digest). Contracts in `packages/shared/src/schemas.ts`.
- **Backboard (M17).** One assistant, one thread per sender; stores only the agent conversation; recall before parsing, save after replying; 5 s timeouts, fail soft.
- **VEYZL (M15).** GitHub App audits each PR; findings and changes logged in `docs/AI_GOVERNANCE.md`; optional `@veyzl/sdk` wrapper (`apps/server/src/veyzl.ts`) only with demo data.

## 16. Human-only setup (Claude must not do these)

These need accounts, credentials, payments or personal identity. Claude should stop and ask the human to do them, then continue:

1. Create a Gemini API key in Google AI Studio; put it in `.env`. Check the free-tier rate limits shown there for `gemini-3.8-flash`.
2. Create the Google Cloud OAuth client and add test users (section 14.4); put the client id in `.env`.
3. Create the Vultr VM (claim credits) and give Claude SSH access only if the human chooses to.
4. Register the domain via GoDaddy Registry and set DNS.
5. Devpost draft and final submission; MLH Commit Fellowship supplemental form.
6. Switch to the Gemini paid tier (billing) before any real contacts are imported.
7. VEYZL account + GitHub App; Photon 2.0 beta project + iMessage line; Backboard API key + assistant.

---

## 17. Definition of done for the hackathon

- P0 features work end to end on the live URL with seeded data.
- The four AI capabilities in the demo path (query, auto-sort, weekly review, snap to add) work live and from cache.
- No secrets in the repo; no real personal data in `demo/`.
- README has: what it is, screenshots, how to run locally, env vars, tracks entered, and the privacy note (local-first, free tier = demo data only).
