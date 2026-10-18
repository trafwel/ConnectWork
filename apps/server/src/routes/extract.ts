/**
 * M9 — POST /api/ai/extract · done
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
 *      (M9 review, added: LinkedIn URLs must be linkedin.com links, text is capped like the
 *      person card, and exact duplicate rows are removed.)
 *   4. Register it; test with a mocked generate (empty-name row is dropped).
 *   5. Live check: demo/roster.pdf → exactly 8 people.
 *
 * DONE WHEN
 *   - roster.pdf → 8 people; a phone photo of a business card → 1 person.
 *   - Real photos never appear in demo/demo-cache.json.
 *
 * Contract: ExtractRequest / ExtractResponse · Guide: §16
 */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { Hono } from 'hono';
import { ExtractRequest, ExtractResponse } from '@connectwork/shared';
import type { AppDeps } from '../app';
import { EXTRACT_SYSTEM } from '../prompts';
import { structured } from './structured';

const sha256 = (text: string) => createHash('sha256').update(text).digest('hex');

/** Fingerprint of the FICTIONAL demo roster: the only upload the demo cache may store. */
let demoRosterHash: string | null | undefined;
export function isDemoRoster(dataBase64: string): boolean {
  if (demoRosterHash === undefined) {
    try {
      const file = fileURLToPath(new URL('../../../../demo/roster.pdf', import.meta.url));
      demoRosterHash = sha256(readFileSync(file).toString('base64'));
    } catch {
      demoRosterHash = null; // no demo file: nothing is cacheable
    }
  }
  return demoRosterHash !== null && sha256(dataBase64) === demoRosterHash;
}

const clip = (v: string | undefined, max: number) => v?.trim().slice(0, max) || undefined;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const LINKEDIN = /^(https?:\/\/)?([\w-]+\.)?linkedin\.com\//i;

/** Guardrails, exported for tests. Everything the model read from a document is untrusted. */
export function cleanExtracted(res: ExtractResponse, tags: string[]): ExtractResponse {
  const allowed = new Set(tags);
  const seen = new Set<string>();
  const people = res.people.flatMap((p) => {
    const name = clip(p.name, 120);
    if (!name) return [];
    const email = clip(p.email, 300);
    const linkedinUrl = clip(p.linkedinUrl, 300);
    const person = {
      name,
      company: clip(p.company, 300),
      role: clip(p.role, 300),
      school: clip(p.school, 300),
      email: email && EMAIL.test(email) ? email : undefined,
      linkedinUrl: linkedinUrl && LINKEDIN.test(linkedinUrl) ? linkedinUrl : undefined,
      suggestedTag: p.suggestedTag && allowed.has(p.suggestedTag) ? p.suggestedTag : undefined,
    };
    const key = [person.name, person.company, person.email].join('|').toLowerCase();
    if (seen.has(key)) return [];
    seen.add(key);
    return [person];
  });
  return { people };
}

export function registerExtract(routes: Hono, deps: AppDeps): void {
  structured(routes, deps, {
    path: '/extract',
    request: ExtractRequest,
    response: ExtractResponse,
    system: EXTRACT_SYSTEM,
    thinking: 'low',
    // Step 1. The file itself goes to Gemini as inline data, next to the instructions.
    parts: (b) => [{ inlineData: { mimeType: b.file.mimeType, data: b.file.dataBase64 } }, { text: `Allowed tags: ${b.tags.join(', ')}` }],
    post: (res, b) => cleanExtracted(res, b.tags),
    // Step 2. PRIVACY: real photos are never written to the demo cache; only the demo roster.
    cacheable: (b) => isDemoRoster(b.file.dataBase64),
  });
}
