/**
 * M16 — What did the text mean? · done
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
import { AgentIntent } from '@connectwork/shared';
import { AiError, callStructured, type Generate } from '../gemini';
import { INTENT_SYSTEM } from '../prompts';

const DAY_MS = 24 * 60 * 60 * 1000;

/** Step 2. A due date the browser can trust: a real YYYY-MM-DD, from today to a year ahead. */
export function cleanDueDate(date: string | undefined, today: string): string | undefined {
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return undefined;
  const d = Date.parse(`${date}T00:00:00Z`);
  const t = Date.parse(`${today}T00:00:00Z`);
  if (Number.isNaN(d) || new Date(d).toISOString().slice(0, 10) !== date) return undefined; // e.g. 2026-02-30
  return d >= t && d <= t + 365 * DAY_MS ? date : undefined;
}

export async function parseIntent(
  generate: Generate,
  text: string,
  recentContext?: string,
  today: string = new Date().toISOString().slice(0, 10),
): Promise<AgentIntent> {
  let intent: AgentIntent;
  try {
    // Step 1.
    intent = await callStructured(generate, {
      system: INTENT_SYSTEM,
      thinking: 'low',
      schema: AgentIntent,
      parts: [{ text: `Today is ${today}.\n` + (recentContext ? `Recent conversation:\n${recentContext}\n\n` : '') + `Text: ${text}` }],
    });
  } catch (e) {
    // Step 3. Still answer something: the browser treats it as a question.
    if (e instanceof AiError) return { intent: 'query', question: text };
    throw e;
  }
  // Step 2. Guardrails in code.
  if (intent.person) intent.person = { ...intent.person, name: intent.person.name.trim() };
  if (intent.target) intent.target = { ...intent.target, personName: intent.target.personName.trim(), dueDate: cleanDueDate(intent.target.dueDate, today) };
  if (intent.intent === 'query' && !intent.question?.trim()) intent.question = text;
  if ((intent.intent === 'remind' || intent.intent === 'log_contact') && !intent.target?.personName) return { intent: 'query', question: text };
  if (intent.intent === 'add_person' && !intent.person?.name) return { intent: 'query', question: text };
  return intent;
}
