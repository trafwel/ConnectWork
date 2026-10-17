import { ApiError, GoogleGenAI } from '@google/genai';
import { z } from 'zod';

export type Part = { text: string } | { inlineData: { mimeType: string; data: string } };

/** Returns the model's raw JSON text. Injected so tests can run without a key. */
export type Generate = (opts: { system: string; parts: Part[]; jsonSchema: unknown }) => Promise<string>;

export type AiErrorCode = 'no_api_key' | 'rate_limited' | 'bad_ai_response' | 'ai_unavailable';

export class AiError extends Error {
  constructor(
    readonly code: AiErrorCode,
    message: string,
  ) {
    super(message);
  }
}

export function geminiGenerate(apiKey: string, model: string): Generate {
  const ai = new GoogleGenAI({ apiKey, httpOptions: { timeout: 30_000 } });
  return async ({ system, parts, jsonSchema }) => {
    try {
      const res = await ai.models.generateContent({
        model,
        contents: [{ role: 'user', parts }],
        config: {
          systemInstruction: system,
          responseMimeType: 'application/json',
          responseJsonSchema: jsonSchema,
          temperature: 0.3,
        },
      });
      return res.text ?? '';
    } catch (err) {
      if (err instanceof ApiError && err.status === 429) throw new AiError('rate_limited', 'Gemini rate limit reached');
      throw new AiError('ai_unavailable', `Gemini request failed: ${(err as Error).message}`);
    }
  };
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
  opts: { system: string; parts: Part[]; schema: z.ZodType<T> },
): Promise<T> {
  const jsonSchema = toGeminiSchema(opts.schema);
  const first = parse(opts.schema, await generate({ system: opts.system, parts: opts.parts, jsonSchema }));
  if (first.ok) return first.data;

  const retryParts: Part[] = [
    ...opts.parts,
    { text: `Your previous reply did not match the schema: ${first.error}\nReply again with valid JSON only.` },
  ];
  const second = parse(opts.schema, await generate({ system: opts.system, parts: retryParts, jsonSchema }));
  if (second.ok) return second.data;
  throw new AiError('bad_ai_response', 'The model returned an invalid response twice');
}
