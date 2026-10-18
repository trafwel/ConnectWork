/**
 * M5 — Browser API client · done (aiPost added in step R)
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
 *      Every request sends x-client-date (the user's LOCAL date) as a header; see routes/ai.ts.
 *   4. getHealth(): GET `${BASE}/health`, return the JSON or null on any error.
 *   5. (Step R) aiPost(path, body, schema) = post(`/ai${path}`, body, schema) for M6+ endpoints.
 *
 * Guide: §9.6
 */
import { ApiErrorBody, QueryResponse, type QueryRequest } from '@connectwork/shared';
import type { z } from 'zod';
import { today } from './dates';

export type ApiResult<T> = { ok: true; data: T } | { ok: false; error: ApiErrorBody['error']; message: string };

export interface Health {
  ok: boolean;
  model: string;
  tier: 'free' | 'paid';
  cache: 'off' | 'record' | 'replay';
  aiConfigured: boolean;
}

// Step 1
const BASE: string = import.meta.env.VITE_API_BASE ?? '/api';

// Step 2. Never throws: components get a typed result, and the server's reply is validated again.
async function post<T>(path: string, body: unknown, schema: z.ZodType<T>, signal?: AbortSignal): Promise<ApiResult<T>> {
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-client-date': today() },
      body: JSON.stringify(body),
      signal,
    });
  } catch {
    if (signal?.aborted) return { ok: false, error: 'internal', message: 'Cancelled' }; // the caller ignores it
    return { ok: false, error: 'ai_unavailable', message: "Can't reach the Connectwork server." };
  }
  const json: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const err = ApiErrorBody.safeParse(json);
    if (err.success) return { ok: false, ...err.data };
    return { ok: false, error: res.status === 429 ? 'rate_limited' : 'internal', message: 'Something went wrong. Try again.' };
  }
  const parsed = schema.safeParse(json);
  return parsed.success ? { ok: true, data: parsed.data } : { ok: false, error: 'bad_ai_response', message: 'The server sent an unexpected answer.' };
}

// Step 3
export function askQuery(question: string, summary: string, signal?: AbortSignal, driftDays?: QueryRequest['driftDays']): Promise<ApiResult<QueryResponse>> {
  return post('/ai/query', driftDays ? { question, summary, driftDays } : { question, summary }, QueryResponse, signal);
}

// Step 5 (R). One line per new endpoint: aiPost('/links', body, LinksResponse).
export function aiPost<T>(path: string, body: unknown, schema: z.ZodType<T>, signal?: AbortSignal): Promise<ApiResult<T>> {
  return post(`/ai${path}`, body, schema, signal);
}

// Step 4
export async function getHealth(): Promise<Health | null> {
  try {
    const res = await fetch(`${BASE}/health`);
    return res.ok ? ((await res.json()) as Health) : null;
  } catch {
    return null;
  }
}
