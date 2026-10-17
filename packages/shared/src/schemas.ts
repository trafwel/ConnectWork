import { z } from 'zod';

// Request/response contracts for /api/ai/*. The server validates model
// output against these, and the client validates again before using it.

export const QueryRequest = z.object({
  question: z.string().trim().min(1).max(500),
  summary: z.string().max(400_000),
});
export type QueryRequest = z.infer<typeof QueryRequest>;

export const QueryResponse = z.object({
  answer: z.string().max(400),
  personIds: z.array(z.string()).max(50),
  filterHint: z.enum(['none', 'due', 'drifting']).default('none'),
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

const Ring = z.union([z.literal(1), z.literal(2), z.literal(3)]);

/** Minimal person fields the model needs to sort someone (no notes). */
const PersonBrief = z.object({
  id: z.string(),
  name: z.string(),
  company: z.string().optional(),
  role: z.string().optional(),
  school: z.string().optional(),
  metAt: z.string().optional(),
});

// M6 — auto-sort imported people into rings and tags ------------------------

export const ClassifyRequest = z.object({
  /** At most 150 per call; the client sends larger imports in chunks. */
  people: z.array(PersonBrief).min(1).max(150),
  /** Allowed tag names; the model must choose only from these. */
  tags: z.array(z.string()).min(1),
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
