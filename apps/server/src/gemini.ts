/**
 * M5 — Calling Gemini safely · done (live-tested Oct 17)
 *
 * WHAT THIS ACHIEVES
 *   Every AI call gets structured JSON back, validated, with one retry on a bad
 *   reply and one fallback to another model when the main one is overloaded. Live
 *   testing showed why: on the free tier the same request took 4 s, 38 s or 75 s,
 *   then returned "high demand" (503), deadline errors (504) and rate limits (429).
 *   With the fallback, every test question succeeded.
 *
 * HOW IT FITS
 *   routes/ai.ts (and the scaffolded routes, via structured.ts) call
 *   callStructured(generate, { system, parts, schema, thinking }). `generate` is
 *   injected so tests run without a key.
 *
 * HOW IT WAS BUILT
 *   1. generateContent with systemInstruction, responseMimeType JSON,
 *      responseJsonSchema (from zod via toGeminiSchema), temperature 0.3, and a
 *      thinking level when the route asks for one ('low' for lookups).
 *   2. withFallback: main model gets 20 s; on 429, 5xx, timeout or abort, try each
 *      model in GEMINI_FALLBACK_MODEL (comma-separated) once, 40 s each. 4xx errors
 *      are not retried. On Oct 17 both 3.8-flash and 3.6-flash were overloaded at
 *      once, so the default chain ends with the fast gemini-3.5-flash-lite.
 *   3. callStructured: parse + zod-validate; on failure retry once with the
 *      validation errors appended; a second failure → AiError('bad_ai_response').
 *   4. Errors map to AiError codes the routes turn into friendly messages.
 *
 * DONE WHEN
 *   - gemini.test.ts passes; the four live questions in guide §10 succeed.
 *
 * Guide: §9.3, §10
 */
import { ApiError, GoogleGenAI, ThinkingLevel } from '@google/genai';
import { z } from 'zod';

export type Part = { text: string } | { inlineData: { mimeType: string; data: string } };

/** How much the model reasons before answering. Lookups want 'low'; planning wants more. */
export type Thinking = 'minimal' | 'low' | 'medium' | 'high';

/** Returns the model's raw JSON text. Injected so tests can run without a key. */
export type Generate = (opts: { system: string; parts: Part[]; jsonSchema: unknown; thinking?: Thinking }) => Promise<string>;

const THINKING_LEVELS: Record<Thinking, ThinkingLevel> = {
  minimal: ThinkingLevel.MINIMAL,
  low: ThinkingLevel.LOW,
  medium: ThinkingLevel.MEDIUM,
  high: ThinkingLevel.HIGH,
};

export type AiErrorCode = 'no_api_key' | 'rate_limited' | 'bad_ai_response' | 'ai_unavailable';

export class AiError extends Error {
  constructor(
    readonly code: AiErrorCode,
    message: string,
  ) {
    super(message);
  }
}

/** Primary gets a short leash so an overloaded model fails over quickly; the fallback gets longer (planning calls like /links need ~25 s on 3.6-flash). */
const PRIMARY_TIMEOUT_MS = 20_000;
const FALLBACK_TIMEOUT_MS = 40_000;

/** Overload (500/503), deadline (504), timeouts and per-model rate limits (429) are worth one try elsewhere. */
export function isRetryable(err: unknown): boolean {
  if (err instanceof ApiError) return err.status === 429 || err.status >= 500;
  const msg = String((err as Error)?.message ?? err).toLowerCase();
  return msg.includes('timeout') || msg.includes('timed out') || msg.includes('aborted') || msg.includes('fetch failed');
}

type Attempt = () => Promise<string>;

/**
 * Runs the primary call; on a retryable failure (overload, deadline, rate limit,
 * timeout) tries each fallback in order, once. A non-retryable error stops the
 * chain. Errors map to AiError codes.
 */
export async function withFallback(
  primary: Attempt,
  fallbacks?: Attempt | Attempt[],
  log: (msg: string) => void = console.warn,
): Promise<string> {
  const chain = [primary, ...(fallbacks === undefined ? [] : Array.isArray(fallbacks) ? fallbacks : [fallbacks])];
  let lastError: unknown;
  for (let i = 0; i < chain.length; i++) {
    try {
      return await chain[i]!();
    } catch (err) {
      lastError = err;
      if (!isRetryable(err) || i === chain.length - 1) break;
      log(`${i === 0 ? 'Primary' : `Fallback ${i}`} model failed (${describe(err)}); trying fallback model ${i + 1}`);
    }
  }
  throw toAiError(lastError);
}

function describe(err: unknown): string {
  return err instanceof ApiError ? `HTTP ${err.status}` : String((err as Error)?.message ?? err).slice(0, 120);
}

function toAiError(err: unknown): AiError {
  if (err instanceof AiError) return err;
  if (err instanceof ApiError && err.status === 429) return new AiError('rate_limited', 'Gemini rate limit reached');
  return new AiError('ai_unavailable', `Gemini request failed: ${String((err as Error)?.message ?? err).slice(0, 300)}`);
}

export function geminiGenerate(apiKey: string, model: string, fallbackModels: string[] = []): Generate {
  const primaryClient = new GoogleGenAI({ apiKey, httpOptions: { timeout: PRIMARY_TIMEOUT_MS } });
  const fallbackClient = new GoogleGenAI({ apiKey, httpOptions: { timeout: FALLBACK_TIMEOUT_MS } });

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

  const fallbacks = [...new Set(fallbackModels)].filter((m) => m && m !== model);
  return (opts) =>
    withFallback(
      () => call(primaryClient, model, opts),
      fallbacks.map((m) => () => call(fallbackClient, m, opts)),
    );
}

/** Gemini's responseJsonSchema accepts a JSON Schema subset; drop the meta key. */
export function toGeminiSchema(schema: z.ZodType): unknown {
  const json = z.toJSONSchema(schema) as Record<string, unknown>;
  delete json.$schema;
  return json;
}

function parse<T>(schema: z.ZodType<T>, text: string): { ok: true; data: T } | { ok: false; error: string } {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return { ok: false, error: 'Reply was not valid JSON.' };
  }
  const result = schema.safeParse(json);
  return result.success ? { ok: true, data: result.data } : { ok: false, error: z.prettifyError(result.error) };
}

/** Calls the model for JSON matching `schema`, retrying once with the validation errors. */
export async function callStructured<T>(
  generate: Generate,
  opts: { system: string; parts: Part[]; schema: z.ZodType<T>; thinking?: Thinking },
): Promise<T> {
  const jsonSchema = toGeminiSchema(opts.schema);
  const { system, thinking } = opts;
  const first = parse(opts.schema, await generate({ system, parts: opts.parts, jsonSchema, thinking }));
  if (first.ok) return first.data;

  const retryParts: Part[] = [
    ...opts.parts,
    { text: `Your previous reply did not match the schema: ${first.error}\nReply again with valid JSON only.` },
  ];
  const second = parse(opts.schema, await generate({ system, parts: retryParts, jsonSchema, thinking }));
  if (second.ok) return second.data;
  throw new AiError('bad_ai_response', 'The model returned an invalid response twice');
}
