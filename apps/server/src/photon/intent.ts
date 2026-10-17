/**
 * M16 — What did the text mean? · Owner: Person B · ~25 min
 *
 * WHAT THIS ACHIEVES
 *   Turns free-form texts into actions: "who do I know at Stripe?" (query),
 *   "met Sarah Kim from Stripe, ML infra" (add_person), "remind me to email John
 *   Friday" (remind, with Friday resolved to a date), "had coffee with Abbey"
 *   (log_contact), "what's due?" (digest). With Backboard memory (M17), "her"
 *   and "him" resolve to the last person mentioned.
 *
 * HOW IT FITS
 *   photon/agent.ts → parseIntent(generate, text, recentContext) → AgentIntent →
 *   sent with the text to the browser via the relay. The BROWSER does the
 *   actual lookup or write against its local data.
 *
 * STEPS
 *   1. Call callStructured(generate, { system: INTENT_SYSTEM, thinking: 'low',
 *      schema: AgentIntent, parts: [{ text: `Today is ${today}.\n` +
 *      (recentContext ? `Recent conversation:\n${recentContext}\n\n` : '') + `Text: ${text}` }] }).
 *   2. Guardrails: trim names; drop target.dueDate unless it matches YYYY-MM-DD and is
 *      within the next 365 days; if intent is 'query' but question is empty, use the text.
 *   3. On AiError, fall back to { intent: 'query', question: text } so the user still
 *      gets an answer (the browser's query flow has its own error handling).
 *   4. Tests (photon/intent.test.ts) with a mocked generate: date guardrail, empty
 *      question fallback, AiError fallback.
 *
 * DONE WHEN
 *   - The five example texts above parse to the right intents in a live check.
 *
 * Contract: AgentIntent · Prompt: INTENT_SYSTEM · Guide: §23
 */
import type { AgentIntent } from '@connectwork/shared';
import type { Generate } from '../gemini';

export async function parseIntent(
  _generate: Generate,
  text: string,
  _recentContext?: string,
  _today: string = new Date().toISOString().slice(0, 10),
): Promise<AgentIntent> {
  // TODO(M16) steps 1–3
  return { intent: 'query', question: text };
}
