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
