/**
 * M5 — "Ask Connectwork" · Owner: Person B · ~45 min
 *
 * WHAT THIS ACHIEVES
 *   The agent's front door: type a question, and the answer lights up the right
 *   people on the map (and opens their card when there's exactly one).
 *
 * HOW IT FITS
 *   Builds the summary from Dexie (lib/graphSummary.ts) → askQuery (lib/api.ts) →
 *   sets the answer, highlights and filter hint in the store → RingMap and AgentAnswer
 *   react. Lives centered in the top bar.
 *
 * STEPS
 *   1. <form role="search" onSubmit={ask}> with an <Input aria-label="Ask Connectwork about
 *      your network" placeholder="Ask Connectwork… e.g. Who do I know at Microsoft?">, a
 *      decorative sparkle icon (aria-hidden), and a spinner while busy.
 *   2. ask(): ignore empty input or a request in flight; clearFocus();
 *      setAgent({ agentBusy: true, agentAnswer: null, agentError: false }).
 *   3. Load people, links, reminders from Dexie (Promise.all) and call
 *      askQuery(question, buildSummary(people, links, reminders)).
 *   4. Error → setAgent({ agentBusy: false, agentAnswer: result.message, agentError: true }).
 *   5. Success → ids = model ids that exist locally ∪ exactMatches(question, people);
 *      setAgent({ agentBusy: false, agentAnswer: answer }); setHighlights(ids);
 *      if filterHint !== 'none' → setFilter(filterHint); if exactly one id → selectPerson(id).
 *   6. Escape in the input clears the text and calls clearFocus().
 *
 * DONE WHEN
 *   - "Who do I know at Microsoft?" highlights every Microsoft person and dims the rest.
 *
 * Guide: §9.6
 */

export function AgentBar() {
  // TODO(M5) steps 1–6
  return null;
}
