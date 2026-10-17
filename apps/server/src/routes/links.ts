/**
 * M6 — POST /api/ai/links · done
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
 *   1. registerLinks() is one structured() call.
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
import { LinksRequest, LinksResponse } from '@connectwork/shared';
import type { AppDeps } from '../app';
import { LINKS_SYSTEM } from '../prompts';
import { summaryIds } from './summary';
import { structured } from './structured';

/** "fromId|toId" with the smaller id first, so A–B and B–A are the same pair. */
const pairKey = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`);

export function registerLinks(routes: Hono, deps: AppDeps): void {
  structured(routes, deps, {
    path: '/links',
    request: LinksRequest,
    response: LinksResponse,
    system: LINKS_SYSTEM,
    thinking: 'medium',
    parts: (b) => [{ text: `Network:\n${b.summary}` + (b.focusIds?.length ? `\n\nFocus on: ${b.focusIds.join(', ')}` : '') }],
    // Guardrails: no invented ids, no self-links, no pair that is already linked, no duplicates.
    post: (res, b) => {
      const known = summaryIds(b.summary);
      const existing = new Set(
        b.summary
          .split('\n')
          .filter((l) => l.startsWith('L|'))
          .map((l) => {
            const [, from = '', to = ''] = l.split('|');
            return pairKey(from, to);
          }),
      );
      const seen = new Set<string>();
      return {
        links: res.links.filter((l) => {
          const key = pairKey(l.fromId, l.toId);
          const ok = l.fromId !== l.toId && known.has(l.fromId) && known.has(l.toId) && !existing.has(key) && !seen.has(key);
          seen.add(key);
          return ok;
        }),
      };
    },
  });
}
