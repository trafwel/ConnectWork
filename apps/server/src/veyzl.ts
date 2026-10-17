/**
 * M15 — Optional VEYZL live audit SDK · Owner: Person B · ~20 min · OPTIONAL
 *
 * WHAT THIS ACHIEVES
 *   The core of the VEYZL track is the GitHub App auditing every PR (no code
 *   needed — see docs/AI_GOVERNANCE.md). This file adds the optional runtime
 *   side: VEYZL's SDK wraps the @google/genai client and records each prompt
 *   and response as audit evidence, which strengthens the "safe enough to ship"
 *   story in the demo.
 *
 * PRIVACY — READ FIRST
 *   The SDK sends request content to VEYZL. Enable it ONLY with fictional demo
 *   data (same rule as the Gemini free tier). It is off unless VEYZL_API_KEY is set.
 *
 * HOW IT FITS
 *   gemini.ts creates `new GoogleGenAI(...)` clients. When VEYZL is enabled,
 *   wrapClient() returns the VEYZL-wrapped client instead; everything else
 *   (fallback, retry, validation) stays the same.
 *
 * STEPS
 *   1. `pnpm --filter @connectwork/server add @veyzl/sdk`
 *   2. Read the package README for the Gemini wrapper (VeyzlGemini) constructor
 *      options — the VEYZL docs page doesn't list them; don't guess.
 *   3. Implement wrapClient(): if !env.veyzlApiKey return the client unchanged;
 *      else return the wrapped client (the SDK records without blocking calls).
 *   4. In gemini.ts geminiGenerate(), pass both clients through wrapClient().
 *   5. Health: add `veyzl: Boolean(env.veyzlApiKey)` to /api/health.
 *   6. Run one demo question and confirm the record appears in the VEYZL dashboard.
 *
 * DONE WHEN
 *   - With VEYZL_API_KEY set, demo calls show up as evidence in VEYZL;
 *     without it, behaviour is unchanged.
 *
 * Guide: docs/IMPLEMENTATION_GUIDE.md §22 · Evidence log: docs/AI_GOVERNANCE.md
 */
import type { GoogleGenAI } from '@google/genai';
import { env } from './env';

export function wrapClient(client: GoogleGenAI): GoogleGenAI {
  if (!env.veyzlApiKey) return client;
  // TODO(M15) steps 1–3: return the VEYZL-wrapped client (VeyzlGemini from @veyzl/sdk)
  return client;
}
