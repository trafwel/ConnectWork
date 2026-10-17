/**
 * M6 — POST /api/ai/links · Owner: Person B · ~30 min
 *
 * WHAT THIS ACHIEVES
 *   The "Abbey and John" moment from our pitch: the AI scans the network and
 *   proposes people who probably know each other (same school, same company,
 *   same club) but aren't connected on the map yet. Each suggestion carries
 *   its evidence, so the user can trust or reject it. This is the feature that
 *   shows something LinkedIn can't: how your connections connect.
 *
 * HOW IT FITS
 *   Browser (lib/aiFlows.ts → findHiddenLinks) sends the graph summary →
 *   this route → Gemini (LINKS_SYSTEM, thinking 'medium') → guardrails →
 *   browser writes them as `suggested` links (dashed lines appear at once) →
 *   ReviewSheet → Accept makes them `accepted`, the rest are removed.
 *
 * STEPS
 *   1. Implement registerLinks() with one structured() call (TODOs below).
 *   2. Register it in routes/ai.ts.
 *   3. Test with a mocked generate returning: a self-link, an unknown id, and
 *      one valid link → only the valid link survives.
 *   4. Live check on the seed data: Abbey Chen ↔ John Park must appear with
 *      an evidence label (both UW, Microsoft). If not, tighten LINKS_SYSTEM.
 *
 * DONE WHEN
 *   - Abbey ↔ John is found on the seed data.
 *   - Invented ids and self-links can never reach the browser.
 *
 * Contract: LinksRequest / LinksResponse · Guide: §12.1–12.3, §12.6
 */
import type { Hono } from 'hono';
import type { AppDeps } from '../app';

export function registerLinks(_routes: Hono, _deps: AppDeps): void {
  // TODO(M6) 1: structured(_routes, _deps, {
  //   path: '/links', request: LinksRequest, response: LinksResponse,
  //   system: LINKS_SYSTEM, thinking: 'medium',
  // TODO(M6) 2: parts: (b) => [{ text: `Network:\n${b.summary}` + (b.focusIds?.length ? `\n\nFocus on: ${b.focusIds.join(', ')}` : '') }],
  // TODO(M6) 3: post: const known = summaryIds(b.summary) (exported from routes/ai.ts);
  //   keep links where fromId !== toId and both ids are known.
  //   (The browser additionally drops confidence < 0.5.)
  // TODO(M6) 4: register it from routes/ai.ts.
}
