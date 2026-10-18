/**
 * M5 — Calling Gemini safely · done
 *
 * WHAT THIS ACHIEVES
 *   Every AI call gets structured JSON back, validated, with one retry on a bad
 *   reply and a fallback chain of models when the main one is overloaded. Live
 *   testing on Oct 17 showed why: on the free tier the same request took 4 s, 38 s
 *   or 75 s, and models returned "high demand" (503), deadline errors (504) and
 *   rate limits (429) — sometimes two models at once.
 *
 * HOW IT FITS
 *   routes/ai.ts (and later routes/structured.ts) call
 *   callStructured(generate, { system, parts, schema, thinking }). `generate` is
 *   INJECTED, so tests run with a fake and never need a key.
 *
 * STEPS
 *   1. `pnpm --filter @connectwork/server add @google/genai zod`
 *   2. toGeminiSchema(zodSchema): const json = z.toJSONSchema(schema); delete json.$schema;
 *      (zod 4 has toJSONSchema built in; Gemini's responseJsonSchema rejects the $schema key.)
 *   3. isRetryable(err): ApiError with status 429 or ≥ 500 → true; otherwise an error whose
 *      message mentions timeout / timed out / aborted / fetch failed → true; else false.
 *   4. withFallback(primary, fallbacks?, log = console.warn): try primary, then each fallback in
 *      order, but ONLY continue after a retryable error; log "Primary model failed (HTTP 503);
 *      trying fallback model 1"; a non-retryable error stops the chain. Map the final error:
 *      ApiError 429 → AiError('rate_limited'); anything else → AiError('ai_unavailable', message).
 *   5. geminiGenerate(apiKey, model, fallbackModels = []):
 *        const primary = new GoogleGenAI({ apiKey, httpOptions: { timeout: 20_000 } });
 *        const fallback = new GoogleGenAI({ apiKey, httpOptions: { timeout: 40_000 } });
 *        call = (client, name, opts) => client.models.generateContent({
 *          model: name, contents: [{ role: 'user', parts: opts.parts }],
 *          config: { systemInstruction: opts.system, responseMimeType: 'application/json',
 *                    responseJsonSchema: opts.jsonSchema, temperature: 0.3,
 *                    ...(opts.thinking && { thinkingConfig: { thinkingLevel: ThinkingLevel.LOW … } }) } })
 *        return res.text ?? '';
 *      Return (opts) => withFallback(() => call(primary, model, opts), fallbacks.map(m => () => call(fallback, m, opts))).
 *      Fallback models default to gemini-3.6-flash then gemini-3.5-flash-lite (env.geminiFallbackModels).
 *      Why 20 s / 40 s: an overloaded main model should fail over fast; planning calls
 *      (/links) need ~25 s on 3.6-flash.
 *   M5 review: the whole chain has a 60 s budget, so the worst case isn't 20 + 40 + 40 s.
 *   6. callStructured(generate, { system, parts, schema, thinking }):
 *      a. text = await generate({ system, parts, jsonSchema: toGeminiSchema(schema), thinking });
 *      b. JSON.parse + schema.safeParse; success → return data.
 *      c. Failure → retry ONCE with an extra part:
 *         `Your previous reply did not match the schema: ${z.prettifyError(error)}\nReply again with valid JSON only.`
 *      d. Second failure → throw new AiError('bad_ai_response', …).
 *
 * DONE WHEN
 *   - gemini.test.ts passes (unskip it), and the four live questions in guide §10 succeed.
 *
 * Guide: docs/IMPLEMENTATION_GUIDE.md §9.3, §10
 */
import { ApiError, GoogleGenAI, ThinkingLevel } from '@google/genai';
import { z } from 'zod';

export type Part = { text: string } | { inlineData: { mimeType: string; data: string } };

/** How much the model reasons before answering. Lookups want 'low'; planning wants more. */
export type Thinking = 'minimal' | 'low' | 'medium' | 'high';

/** Returns the model's raw JSON text. Injected so tests can run without a key. */
export type Generate = (opts: { system: string; parts: Part[]; jsonSchema: unknown; thinking?: Thinking }) => Promise<string>;

export type AiErrorCode = 'no_api_key' | 'rate_limited' | 'bad_ai_response' | 'ai_unavailable';

export class AiError extends Error {
  constructor(
    readonly code: AiErrorCode,
    message: string,
  ) {
    super(message);
  }
}

const THINKING_LEVELS: Record<Thinking, ThinkingLevel> = {
  minimal: ThinkingLevel.MINIMAL,
  low: ThinkingLevel.LOW,
  medium: ThinkingLevel.MEDIUM,
  high: ThinkingLevel.HIGH,
};

/** An overloaded main model should fail over fast; planning calls (/links) need ~25 s on 3.6-flash. */
const PRIMARY_TIMEOUT_MS = 20_000;
const FALLBACK_TIMEOUT_MS = 40_000;
/** Total time a user can be kept waiting before we stop trying more models. */
const CHAIN_BUDGET_MS = 60_000;

type Attempt = () => Promise<string>;

// Step 3. Overload (5xx), rate limits (429) and timeouts are worth trying elsewhere; a bad request isn't.
export function isRetryable(err: unknown): boolean {
  if (err instanceof ApiError) return err.status === 429 || err.status >= 500;
  const msg = String((err as Error)?.message ?? err).toLowerCase();
  return ['timeout', 'timed out', 'aborted', 'fetch failed'].some((m) => msg.includes(m));
}

function describe(err: unknown): string {
  return err instanceof ApiError ? `HTTP ${err.status}` : String((err as Error)?.message ?? err).slice(0, 120);
}

function toAiError(err: unknown): AiError {
  if (err instanceof AiError) return err;
  if (err instanceof ApiError && err.status === 429) return new AiError('rate_limited', 'Gemini rate limit reached');
  return new AiError('ai_unavailable', `Gemini request failed: ${describe(err)}`);
}

// Step 4. Primary, then each fallback in order, only after a retryable error and while budget remains.
export async function withFallback(
  primary: Attempt,
  fallbacks: Attempt | Attempt[] = [],
  log: (msg: string) => void = console.warn,
  budgetMs = CHAIN_BUDGET_MS,
): Promise<string> {
  const chain = [primary, ...(Array.isArray(fallbacks) ? fallbacks : [fallbacks])];
  const started = Date.now();
  let lastErr: unknown;
  // M9 live finding: main + fallback 1 were rate-limited and fallback 2 failed differently, so
  // users saw "did not respond" instead of "busy, try again in a minute". Remember a 429.
  let rateLimited = false;
  for (const [i, attempt] of chain.entries()) {
    if (i > 0) {
      if (!isRetryable(lastErr) || Date.now() - started > budgetMs) break;
      log(`${i === 1 ? 'Primary model' : `Fallback model ${i - 1}`} failed (${describe(lastErr)}); trying fallback model ${i}`);
    }
    try {
      return await attempt();
    } catch (err) {
      lastErr = err;
      if (err instanceof ApiError && err.status === 429) rateLimited = true;
    }
  }
  if (rateLimited) throw new AiError('rate_limited', `Gemini rate limit reached (last error: ${describe(lastErr)})`);
  throw toAiError(lastErr);
}

// Steps 1, 5.
export function geminiGenerate(apiKey: string, model: string, fallbackModels: string[] = []): Generate {
  const primaryClient = new GoogleGenAI({ apiKey, httpOptions: { timeout: PRIMARY_TIMEOUT_MS } });
  const fallbackClient = new GoogleGenAI({ apiKey, httpOptions: { timeout: FALLBACK_TIMEOUT_MS } });
  const fallbacks = fallbackModels.filter((m) => m !== model);

  const call = async (client: GoogleGenAI, name: string, opts: Parameters<Generate>[0]) => {
    const res = await client.models.generateContent({
      model: name,
      contents: [{ role: 'user', parts: opts.parts }],
      config: {
        systemInstruction: opts.system,
        responseMimeType: 'application/json',
        responseJsonSchema: opts.jsonSchema,
        temperature: 0.3,
        ...(opts.thinking ? { thinkingConfig: { thinkingLevel: THINKING_LEVELS[opts.thinking] } } : {}),
      },
    });
    return res.text ?? '';
  };

  return (opts) =>
    withFallback(
      () => call(primaryClient, model, opts),
      fallbacks.map((m) => () => call(fallbackClient, m, opts)),
    );
}

/** List caps above this are our safety net (zod still enforces them), not guidance for the model. */
const MAX_ITEMS_SENT = 100;

/** Removes `maxItems` above MAX_ITEMS_SENT everywhere in a JSON schema (in place). */
function dropLargeMaxItems(node: unknown): void {
  if (Array.isArray(node)) return node.forEach(dropLargeMaxItems);
  if (!node || typeof node !== 'object') return;
  const obj = node as Record<string, unknown>;
  if (typeof obj.maxItems === 'number' && obj.maxItems > MAX_ITEMS_SENT) delete obj.maxItems;
  Object.values(obj).forEach(dropLargeMaxItems);
}

// Step 2. Gemini's responseJsonSchema rejects the "$schema" meta key that zod adds.
// M9 live finding: gemini-3.5-flash-lite (our last fallback) answers 400 to the extract schema
// because of `maxItems: 200`; without it the same request works. Large caps are only sent to
// zod, which still rejects an over-long reply (and callStructured retries once).
export function toGeminiSchema(schema: z.ZodType): unknown {
  const json = z.toJSONSchema(schema) as Record<string, unknown>;
  delete json.$schema;
  dropLargeMaxItems(json);
  return json;
}

function parseReply<T>(schema: z.ZodType<T>, text: string): { ok: true; data: T } | { ok: false; error: string } {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return { ok: false, error: 'Reply was not valid JSON.' };
  }
  const result = schema.safeParse(json);
  return result.success ? { ok: true, data: result.data } : { ok: false, error: z.prettifyError(result.error) };
}

// Step 6. Ask for JSON matching `schema`; one retry that tells the model what was wrong.
export async function callStructured<T>(
  generate: Generate,
  opts: { system: string; parts: Part[]; schema: z.ZodType<T>; thinking?: Thinking },
): Promise<T> {
  const { system, thinking } = opts;
  const jsonSchema = toGeminiSchema(opts.schema);
  const first = parseReply(opts.schema, await generate({ system, parts: opts.parts, jsonSchema, thinking }));
  if (first.ok) return first.data;

  const retryParts: Part[] = [...opts.parts, { text: `Your previous reply did not match the schema: ${first.error}\nReply again with valid JSON only.` }];
  const second = parseReply(opts.schema, await generate({ system, parts: retryParts, jsonSchema, thinking }));
  if (second.ok) return second.data;
  throw new AiError('bad_ai_response', 'The model returned an invalid response twice');
}
