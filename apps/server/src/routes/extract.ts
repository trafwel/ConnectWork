/**
 * M9 — POST /api/ai/extract · Owner: Person B · ~30 min (route only)
 *
 * WHAT THIS ACHIEVES
 *   "Snap to add": photograph a business card, or drop a club roster PDF or an
 *   event attendee list, and the people on it appear in a review sheet. This
 *   kills the "typing in hundreds of people" problem for everyone LinkedIn
 *   doesn't cover, and it's a real use of Gemini's image/PDF understanding
 *   (our MLH "Best Use of Gemini" entry).
 *
 * HOW IT FITS
 *   components/SnapDialog.tsx downscales the image (lib/image.ts) → this route
 *   sends it to Gemini as inlineData + EXTRACT_SYSTEM → people come back →
 *   the browser dedupes them against the network (findMatch in lib/csv.ts) →
 *   ReviewSheet → applyImport(…, 'snap', tag).
 *
 * STEPS
 *   1. Implement registerExtract() with one structured() call:
 *      parts: (b) => [{ inlineData: { mimeType: b.file.mimeType, data: b.file.dataBase64 } },
 *                     { text: `Allowed tags: ${b.tags.join(', ')}` }]
 *   2. PRIVACY: real photos must never be written to the demo cache.
 *      Set cacheable: false … except for the demo roster: compute the sha256 of
 *      demo/roster.pdf's base64 once at startup and allow caching only when the
 *      request matches it (so M12 can record the scripted demo).
 *   3. post(): trim names, drop empty names, drop suggestedTag values that
 *      aren't in b.tags, drop emails without "@".
 *   4. Register it; test with a mocked generate (empty-name row is dropped).
 *   5. Live check: demo/roster.pdf → exactly 8 people.
 *
 * DONE WHEN
 *   - roster.pdf → 8 people; a phone photo of a business card → 1 person.
 *   - Real photos never appear in demo/demo-cache.json.
 *
 * Contract: ExtractRequest / ExtractResponse · Guide: §16
 */
import type { Hono } from 'hono';
import type { AppDeps } from '../app';

export function registerExtract(_routes: Hono, _deps: AppDeps): void {
  // TODO(M9) 1: structured(_routes, _deps, { path: '/extract', request: ExtractRequest, response: ExtractResponse,
  //   system: EXTRACT_SYSTEM, thinking: 'low', parts: …see step 1…, post: …see step 3…, cacheable: …see step 2… })
  //   Note: cacheable is a boolean today; to allow "only the demo roster", change the
  //   StructuredRoute type to `cacheable?: boolean | ((body: Req) => boolean)`.
  // TODO(M9) 2: register it from routes/ai.ts.
}
