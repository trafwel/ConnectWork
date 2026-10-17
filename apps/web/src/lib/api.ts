import { ApiErrorBody, QueryResponse } from '@connectwork/shared';

const BASE = import.meta.env.VITE_API_BASE ?? '/api';

export type ApiResult<T> = { ok: true; data: T } | { ok: false; error: ApiErrorBody['error']; message: string };

async function post<T>(path: string, body: unknown, schema: { safeParse: (v: unknown) => { success: boolean; data?: T } }): Promise<ApiResult<T>> {
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  } catch {
    return { ok: false, error: 'ai_unavailable', message: "Can't reach the Connectwork server." };
  }
  const json: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const err = ApiErrorBody.safeParse(json);
    return err.success
      ? { ok: false, ...err.data }
      : { ok: false, error: res.status === 429 ? 'rate_limited' : 'internal', message: 'Something went wrong. Try again.' };
  }
  const parsed = schema.safeParse(json);
  return parsed.success ? { ok: true, data: parsed.data as T } : { ok: false, error: 'bad_ai_response', message: 'The AI gave an unusable answer.' };
}

export const askQuery = (question: string, summary: string) => post('/ai/query', { question, summary }, QueryResponse);

export interface Health {
  ok: boolean;
  model: string;
  tier: 'free' | 'paid';
  cache: 'off' | 'record' | 'replay';
  aiConfigured: boolean;
}

export async function getHealth(): Promise<Health | null> {
  try {
    const res = await fetch(`${BASE}/health`);
    return res.ok ? ((await res.json()) as Health) : null;
  } catch {
    return null;
  }
}
