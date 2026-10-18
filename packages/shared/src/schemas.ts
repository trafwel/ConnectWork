/**
 * M5 (and M6–M11 below) — API contracts as zod schemas · done
 *
 * WHAT THIS ACHIEVES
 *   The single source of truth for what each AI endpoint accepts and returns.
 *   The server validates the MODEL's reply against these (and retries once if it
 *   doesn't match); the browser validates the SERVER's reply again. A malformed
 *   AI answer can never reach the UI or the database.
 *
 * HOW IT FITS
 *   Shared by apps/server (routes, gemini.ts turns them into JSON Schema for
 *   Gemini) and apps/web (lib/api.ts). Mirrors SPEC.md §9.4.
 *
 * HOW IT WAS BUILT
 *   1. QueryRequest / QueryResponse for M5; ApiErrorBody for every error reply.
 *   2. Limits are part of the contract (answer ≤ 400 chars, ≤ 50 ids, ≤ 150
 *      people per classify call) — they keep prompts and replies bounded.
 *   3. The M6–M11 schemas further down are final contracts for the scaffolded routes.
 *
 * Guide: §9.1
 */
import { z } from 'zod';

// Request/response contracts for /api/ai/*. The server validates model
// output against these, and the client validates again before using it.

const driftDays = z.number().int().min(7).max(3650);
export const QueryRequest = z.object({
  question: z.string().trim().min(1).max(500),
  summary: z.string().max(400_000),
  /** M10: the user's "lost touch" limits in days, sent only when they differ from 90 / 180. */
  driftDays: z.object({ ring1: driftDays, ring2: driftDays }).optional(),
});
export type QueryRequest = z.infer<typeof QueryRequest>;

const Ring = z.union([z.literal(1), z.literal(2), z.literal(3)]);

/**
 * Oct 18 (team request): changes the user asks for in the search bar ("connect Abbey and John",
 * "move Theo to ring 1", "remove all suggested connections"). The model only PROPOSES them; the
 * browser lists them in the review sheet and applies only the ones the user accepts. One flat
 * shape (not a union per op) because Gemini's JSON-schema mode handles flat objects best;
 * cleanEdits() (edits.ts) enforces what each op needs.
 */
export const EDIT_OPS = ['add_link', 'remove_link', 'remove_suggested_links', 'set_ring', 'set_tag', 'add_person', 'remove_person'] as const;
export const NetworkEdit = z.object({
  op: z.enum(EDIT_OPS),
  /** The people the edit is about: two for links, one for ring/tag/remove, none otherwise. */
  personIds: z.array(z.string()).max(2).default([]),
  ring: Ring.optional(),
  tag: z.string().trim().min(1).max(40).optional(),
  /** add_person only. */
  name: z.string().trim().min(1).max(120).optional(),
  company: z.string().trim().max(120).optional(),
  role: z.string().trim().max(120).optional(),
  /** add_link only: what connects them. */
  label: z.string().trim().max(60).optional(),
});
export type NetworkEdit = z.infer<typeof NetworkEdit>;

export const QueryResponse = z.object({
  answer: z.string().max(400),
  personIds: z.array(z.string()).max(50),
  filterHint: z.enum(['none', 'due', 'drifting']).default('none'),
  /** Oct 18: empty for questions. Recorded demo answers predate it, hence the default. */
  edits: z.array(NetworkEdit).max(20).default([]),
  /**
   * Oct 18 (team request: "text me Lena's items"): the message to text the user, when they ask
   * for one. The browser sends it through Photon to the owner's own number only.
   */
  textMe: z.string().trim().min(1).max(600).optional(),
});
export type QueryResponse = z.infer<typeof QueryResponse>;

/** Error body returned by every /api route. */
export const ApiErrorBody = z.object({
  error: z.enum(['bad_request', 'no_api_key', 'rate_limited', 'bad_ai_response', 'ai_unavailable', 'internal']),
  message: z.string(),
});
export type ApiErrorBody = z.infer<typeof ApiErrorBody>;

// ---------------------------------------------------------------------------
// M6–M11 contracts. These are final (they mirror SPEC.md §9.4); the routes
// and UI that use them are scaffolds with step-by-step TODO comments.
// Rule of thumb: the server validates the model's reply with the *Response*
// schema; the client validates the server's reply with it again.
// ---------------------------------------------------------------------------


/** Minimal person fields the model needs to sort someone (no notes). */
// M6 review: every field is capped like the person card, so a request can't smuggle huge text to the model.
const PersonBrief = z.object({
  id: z.string().max(64),
  name: z.string().max(120),
  company: z.string().max(300).optional(),
  role: z.string().max(300).optional(),
  school: z.string().max(300).optional(),
  metAt: z.string().max(10).optional(),
});

// M6 — auto-sort imported people into rings and tags ------------------------

export const ClassifyRequest = z.object({
  /** At most 150 per call; the client sends larger imports in chunks. */
  people: z.array(PersonBrief).min(1).max(150),
  /** Allowed tag names; the model must choose only from these. */
  tags: z.array(z.string().max(40)).min(1).max(20),
  /** Optional "about you" text from Settings, e.g. "UW CS junior, interning at Amazon". */
  userContext: z.string().max(500).optional(),
});
export type ClassifyRequest = z.infer<typeof ClassifyRequest>;

export const ClassifyResponse = z.object({
  items: z.array(
    z.object({
      id: z.string(),
      ring: Ring,
      primaryTag: z.string(),
      tags: z.array(z.string()).max(4),
      /** Shown in the review sheet so the user can judge the suggestion. */
      reason: z.string().max(120),
    }),
  ),
});
export type ClassifyResponse = z.infer<typeof ClassifyResponse>;

// M6 — hidden links between people the user knows ------------------------------

export const LinksRequest = z.object({
  summary: z.string().max(400_000),
  /** Optional: only look for links involving these people. */
  focusIds: z.array(z.string()).optional(),
});
export type LinksRequest = z.infer<typeof LinksRequest>;

export const LinksResponse = z.object({
  links: z
    .array(
      z.object({
        fromId: z.string(),
        toId: z.string(),
        /** The evidence, e.g. "both UW, both Microsoft". */
        label: z.string().max(60),
        confidence: z.number().min(0).max(1),
      }),
    )
    .max(15),
});
export type LinksResponse = z.infer<typeof LinksResponse>;

// M8 — weekly review ------------------------------------------------------------

/** Shortlist computed in the browser (lib/weeklyCandidates.ts); the model only picks and writes. */
export const Candidate = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('follow_up'), personId: z.string(), reminderId: z.string(), dueDate: z.string(), note: z.string() }),
  z.object({ kind: z.literal('reconnect'), personId: z.string(), daysSinceContact: z.number() }),
  z.object({ kind: z.literal('accept_link'), linkId: z.string(), fromId: z.string(), toId: z.string(), label: z.string().optional() }),
  z.object({ kind: z.literal('intro'), personIds: z.tuple([z.string(), z.string()]), shared: z.string() }),
]);
export type Candidate = z.infer<typeof Candidate>;

export const WeeklyReviewRequest = z.object({
  summary: z.string().max(400_000),
  candidates: z.array(Candidate).max(40),
  /** YYYY-MM-DD, so drafts can say "this week" correctly. */
  today: z.string(),
});
export type WeeklyReviewRequest = z.infer<typeof WeeklyReviewRequest>;

export const WeeklyReviewResponse = z.object({
  headline: z.string().max(140),
  actions: z
    .array(
      z.object({
        kind: z.enum(['reconnect', 'follow_up', 'accept_link', 'intro']),
        personIds: z.array(z.string()).min(1).max(2),
        title: z.string().max(80),
        why: z.string().max(160),
        draftMessage: z.string().max(600).optional(),
        reminderDate: z.string().optional(),
        /** For accept_link actions: which suggested link to accept. */
        linkId: z.string().optional(),
      }),
    )
    .max(6),
});
export type WeeklyReviewResponse = z.infer<typeof WeeklyReviewResponse>;

// M9 — snap to add (image or PDF → people) ---------------------------------------

export const ExtractRequest = z.object({
  file: z.object({
    mimeType: z.enum(['image/jpeg', 'image/png', 'image/webp', 'application/pdf']),
    /** Base64 without the "data:…;base64," prefix. Images are downscaled to ≤1600 px first. */
    dataBase64: z.string().max(12_000_000),
  }),
  tags: z.array(z.string()).min(1),
});
export type ExtractRequest = z.infer<typeof ExtractRequest>;

export const ExtractResponse = z.object({
  people: z
    .array(
      z.object({
        name: z.string(),
        company: z.string().optional(),
        role: z.string().optional(),
        school: z.string().optional(),
        email: z.string().optional(),
        linkedinUrl: z.string().optional(),
        suggestedTag: z.string().optional(),
      }),
    )
    .max(200),
});
export type ExtractResponse = z.infer<typeof ExtractResponse>;

// M8 helper — draft one follow-up message -----------------------------------------

export const DraftRequest = z.object({
  person: PersonBrief.extend({ notes: z.string().max(4000).optional(), lastContact: z.string().optional() }),
  sharedConnections: z.array(z.string()).max(20),
  purpose: z.string().max(200).optional(),
});
export type DraftRequest = z.infer<typeof DraftRequest>;

export const DraftResponse = z.object({ message: z.string().max(800) });
export type DraftResponse = z.infer<typeof DraftResponse>;

// M11 — meeting brief ----------------------------------------------------------------

export const MeetingBriefRequest = z.object({
  meeting: z.object({ title: z.string(), start: z.string() }),
  /** Only the matched attendees, with notes (the user asked for prep on these people). */
  attendees: z.array(PersonBrief.extend({ notes: z.string().max(4000).optional(), lastContact: z.string().optional() })).max(20),
  links: z.array(z.string()).max(50),
  reminders: z.array(z.string()).max(50),
});
export type MeetingBriefRequest = z.infer<typeof MeetingBriefRequest>;

export const MeetingBriefResponse = z.object({
  summary: z.string().max(300),
  perPerson: z.array(
    z.object({
      personId: z.string(),
      howYouKnow: z.string().max(140),
      talkingPoints: z.array(z.string().max(120)).max(3),
    }),
  ),
});
export type MeetingBriefResponse = z.infer<typeof MeetingBriefResponse>;

// ---------------------------------------------------------------------------
// M16 — Texting agent (Photon) contracts. Texts arrive on the server, which
// relays them to the user's open Connectwork tab; the tab answers from its
// local data. The network never leaves the browser.
// ---------------------------------------------------------------------------

/** What the user meant by a text. Parsed by Gemini on the server (INTENT_SYSTEM). */
export const AgentIntent = z.object({
  intent: z.enum(['query', 'add_person', 'remind', 'log_contact', 'digest', 'help', 'other']),
  /** For 'query': the question in plain English ("Who do I know at Stripe?"). */
  question: z.string().max(500).optional(),
  /** For 'add_person': who they met. */
  person: z
    .object({
      name: z.string().max(120),
      company: z.string().max(120).optional(),
      role: z.string().max(120).optional(),
      school: z.string().max(120).optional(),
      note: z.string().max(500).optional(),
    })
    .optional(),
  /** For 'remind' and 'log_contact': who, and when (YYYY-MM-DD, resolved from "Friday"). */
  target: z
    .object({
      personName: z.string().max(120),
      dueDate: z.string().optional(),
      note: z.string().max(300).optional(),
    })
    .optional(),
});
export type AgentIntent = z.infer<typeof AgentIntent>;

/** Server → browser over the relay stream (Server-Sent Events). */
export const RelayRequest = z.object({
  id: z.string(),
  /** Channel the text came from, e.g. 'imessage', 'sms', 'whatsapp'. */
  platform: z.string(),
  text: z.string().max(2000),
  intent: AgentIntent,
  receivedAt: z.string(),
});
export type RelayRequest = z.infer<typeof RelayRequest>;

/** Browser → server: the reply to text back, plus who it was about (for the map). */
export const RelayReply = z.object({
  id: z.string(),
  text: z.string().min(1).max(1200),
  personIds: z.array(z.string()).max(50).default([]),
});
export type RelayReply = z.infer<typeof RelayReply>;
