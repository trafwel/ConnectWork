/**
 * M5 — The agent's answer card · Owner: Person A · ~20 min
 *
 * WHAT THIS ACHIEVES
 *   Shows "Thinking…", then the one-line answer and how many people are highlighted,
 *   or a clear error. It sits in an aria-live region, so screen readers announce
 *   answers too.
 *
 * STEPS
 *   1. A wrapper <div aria-live="polite"> absolutely positioned at the top center of the map
 *      (pointer-events-none on the wrapper, pointer-events-auto on the card).
 *   2. agentBusy → a muted "Thinking…" card. agentAnswer → a card with the answer, then
 *      " · N people highlighted" when more than one is highlighted; error state in red
 *      (destructive) text and border.
 *   3. An icon-only clear button (aria-label "Clear answer") → clearFocus().
 *   4. (Step T, Atlas) ink border, card background, and a mono eyebrow above the text:
 *      "FINDING · N PEOPLE" (teal) or "COULD NOT ANSWER" (red).
 *
 * Guide: §9.6
 */

export function AgentAnswer() {
  // TODO(M5) steps 1–3
  return null;
}
