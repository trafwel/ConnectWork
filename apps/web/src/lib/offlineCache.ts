/**
 * M12 — Offline fallback for the demo · done
 *
 * WHAT THIS ACHIEVES
 *   Hackathon Wi-Fi fails and the free Gemini tier gets overloaded (we saw 75 s
 *   responses and 429s on Oct 17). With recorded replies bundled into the app,
 *   the scripted demo works even with the server unreachable — judges always
 *   see the full flow.
 *
 * HOW IT FITS
 *   Server side already exists: DEMO_CACHE=record writes demo/demo-cache.json,
 *   DEMO_CACHE=replay serves it (apps/server/src/cache.ts). This file adds the
 *   browser side: lib/api.ts calls lookupOffline() when the server can't answer.
 *
 * STEPS (as built)
 *   1. canonicalJson and the key function live in @connectwork/shared (cacheKeyAsync, Web
 *      Crypto); apps/server/src/cache.test.ts proves it equals the server's cacheKey().
 *   2. cacheKeyInBrowser(route, body): the server keys on the body AFTER its zod schema parsed
 *      it (e.g. the question is trimmed), so we parse with the same shared schema first.
 *   3. lookupOffline(route, body): demo/demo-cache.json via import.meta.glob, so (a) it's a
 *      separate chunk, fetched only when needed, and (b) the build still works before anyone
 *      has recorded (the file is missing → the glob is empty → no offline answers).
 *   4. lib/api.ts post(): when fetch fails, or the reply isn't from our server (a proxy error
 *      page), or the server says the AI is unavailable / rate limited → try lookupOffline.
 *   5. Demo-day routine: docs/DEMO_DAY.md (record on the morning you present; keys include
 *      dates relative to today).
 *
 * DONE WHEN
 *   - With the server stopped, the scripted questions still get answers in the browser.
 *
 * Guide: §19
 */
import type { z } from 'zod';
import {
  cacheKeyAsync,
  ClassifyRequest,
  DraftRequest,
  ExtractRequest,
  LinksRequest,
  MeetingBriefRequest,
  QueryRequest,
  WeeklyReviewRequest,
} from '@connectwork/shared';

/** Step 2. The request schema of every cached route, by the route string the server keys on. */
const REQUEST_SCHEMAS: Record<string, z.ZodType> = {
  '/api/ai/query': QueryRequest,
  '/api/ai/classify': ClassifyRequest,
  '/api/ai/links': LinksRequest,
  '/api/ai/weekly-review': WeeklyReviewRequest,
  '/api/ai/draft': DraftRequest,
  '/api/ai/extract': ExtractRequest,
  '/api/ai/meeting-brief': MeetingBriefRequest,
};

/** Step 2. The same key the server would compute for this request (null: we can't know it). */
export async function cacheKeyInBrowser(route: string, body: unknown): Promise<string | null> {
  const schema = REQUEST_SCHEMAS[route];
  if (!schema) return null;
  const parsed = schema.safeParse(body);
  return parsed.success ? cacheKeyAsync(route, parsed.data) : null;
}

// Step 3. Lazy and optional: an empty object when demo/demo-cache.json hasn't been recorded.
const files = import.meta.glob<Record<string, unknown>>('../../../../demo/demo-cache.json', { import: 'default' });
let entries: Promise<Record<string, unknown>> | null = null;

async function loadEntries(): Promise<Record<string, unknown>> {
  const load = Object.values(files)[0];
  entries ??= load ? load().catch(() => ({})) : Promise.resolve({});
  return entries;
}

/** Step 3. The recorded reply for this exact request, if the demo recording has one. */
export async function lookupOffline(route: string, body: unknown): Promise<unknown | undefined> {
  const key = await cacheKeyInBrowser(route, body);
  if (!key) return undefined;
  return (await loadEntries())[key];
}

/** For tests: start from a known set of recorded replies. */
export function setOfflineEntriesForTest(e: Record<string, unknown>): void {
  entries = Promise.resolve(e);
}
