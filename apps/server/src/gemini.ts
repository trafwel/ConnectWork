/**
 * M5 — Calling Gemini safely · Owner: Person B · ~1.5 h
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
import type { z } from 'zod';

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

type Attempt = () => Promise<string>;

export function isRetryable(_err: unknown): boolean {
  // TODO(M5) step 3
  return false;
}

export async function withFallback(_primary: Attempt, _fallbacks?: Attempt | Attempt[], _log: (msg: string) => void = console.warn): Promise<string> {
  // TODO(M5) step 4
  throw new AiError('ai_unavailable', 'TODO(M5): withFallback is not implemented yet');
}

export function geminiGenerate(_apiKey: string, _model: string, _fallbackModels: string[] = []): Generate {
  // TODO(M5) steps 1, 5
  return async () => {
    throw new AiError('ai_unavailable', 'TODO(M5): geminiGenerate is not implemented yet');
  };
}

export function toGeminiSchema(_schema: z.ZodType): unknown {
  // TODO(M5) step 2
  return {};
}

export async function callStructured<T>(_generate: Generate, _opts: { system: string; parts: Part[]; schema: z.ZodType<T>; thinking?: Thinking }): Promise<T> {
  // TODO(M5) step 6
  throw new AiError('ai_unavailable', 'TODO(M5): callStructured is not implemented yet');
}
