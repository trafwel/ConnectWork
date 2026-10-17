/**
 * M5 — Browser API client · Owner: Person B · ~30 min
 *
 * WHAT THIS ACHIEVES
 *   Every call to the server returns a typed result — { ok: true, data } or
 *   { ok: false, error, message } — so components never deal with thrown network
 *   errors, HTTP codes or unvalidated JSON.
 *
 * STEPS
 *   1. const BASE = import.meta.env.VITE_API_BASE ?? '/api';
 *   2. post<T>(path, body, schema):
 *      a. fetch POST with content-type JSON; a thrown fetch (server down) →
 *         { ok: false, error: 'ai_unavailable', message: "Can't reach the Connectwork server." }
 *         (M12: look the reply up in the offline cache here first.)
 *      b. Parse JSON (catch → null). Not res.ok → ApiErrorBody.safeParse(json): success →
 *         { ok: false, ...error }; else 'rate_limited' for 429 or 'internal'.
 *      c. schema.safeParse(json): success → { ok: true, data }; else 'bad_ai_response'.
 *   3. askQuery(question, summary) = post('/ai/query', { question, summary }, QueryResponse).
 *   4. getHealth(): GET `${BASE}/health`, return the JSON or null on any error.
 *   5. (Step R) aiPost(path, body, schema) = post(`/ai${path}`, body, schema) for M6+ endpoints.
 *
 * Guide: §9.6
 */
import type { ApiErrorBody, QueryResponse } from '@connectwork/shared';

export type ApiResult<T> = { ok: true; data: T } | { ok: false; error: ApiErrorBody['error']; message: string };

export interface Health {
  ok: boolean;
  model: string;
  tier: 'free' | 'paid';
  cache: 'off' | 'record' | 'replay';
  aiConfigured: boolean;
}

export async function askQuery(_question: string, _summary: string): Promise<ApiResult<QueryResponse>> {
  // TODO(M5) steps 1–3
  return { ok: false, error: 'internal', message: 'TODO(M5): askQuery is not implemented yet' };
}

export async function getHealth(): Promise<Health | null> {
  // TODO(M5) step 4
  return null;
}
