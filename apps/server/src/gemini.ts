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

/** Primary gets a short leash so an overloaded model fails over quickly; the fallback gets a bit longer. */
const PRIMARY_TIMEOUT_MS = 20_000;
const FALLBACK_TIMEOUT_MS = 25_000;

/** Overload (500/503), deadline (504), timeouts and per-model rate limits (429) are worth one try elsewhere. */
export function isRetryable(err: unknown): boolean {
  if (err instanceof ApiError) return err.status === 429 || err.status >= 500;
  const msg = String((err as Error)?.message ?? err).toLowerCase();
  return msg.includes('timeout') || msg.includes('timed out') || msg.includes('aborted') || msg.includes('fetch failed');
}

type Attempt = () => Promise<string>;

/** Runs the primary call, and on a retryable failure the fallback once. Errors map to AiError codes. */
export async function withFallback(primary: Attempt, fallback?: Attempt, log: (msg: string) => void = console.warn): Promise<string> {
  try {
    return await primary();
  } catch (err) {
    if (!fallback || !isRetryable(err)) throw toAiError(err);
    log(`Primary model failed (${describe(err)}); trying fallback model`);
    try {
      return await fallback();
    } catch (err2) {
      throw toAiError(err2);
    }
  }
}

function describe(err: unknown): string {
  return err instanceof ApiError ? `HTTP ${err.status}` : String((err as Error)?.message ?? err).slice(0, 120);
}

function toAiError(err: unknown): AiError {
  if (err instanceof AiError) return err;
  if (err instanceof ApiError && err.status === 429) return new AiError('rate_limited', 'Gemini rate limit reached');
  return new AiError('ai_unavailable', `Gemini request failed: ${String((err as Error)?.message ?? err).slice(0, 300)}`);
}

export function geminiGenerate(apiKey: string, model: string, fallbackModel?: string): Generate {
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

  return (opts) =>
    withFallback(
      () => call(primaryClient, model, opts),
      fallbackModel && fallbackModel !== model ? () => call(fallbackClient, fallbackModel, opts) : undefined,
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
