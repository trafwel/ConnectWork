/**
 * M5 — The agent's answer card · done (step T restyles it)
 *
 * WHAT THIS ACHIEVES
 *   Shows "Thinking…", then the one-line answer and how many people are highlighted,
 *   or a clear error. It sits in an aria-live region, so screen readers announce
 *   answers too.
 *
 * STEPS
 *   1. A wrapper <div aria-live="polite"> absolutely positioned in the TOP-LEFT corner of the map
 *      (M5 review: top center covered the Work sector at 12 o'clock, i.e. the very people
 *      a "who works at…" answer highlights; the corners are outside the rings)
 *      (pointer-events-none on the wrapper, pointer-events-auto on the card).
 *   2. agentBusy → a muted "Thinking…" card. agentAnswer → a card with the answer, then
 *      " · N people highlighted" when more than one is highlighted; error state in red
 *      (destructive) text and border.
 *   3. An icon-only clear button (aria-label "Clear answer") → clearFocus().
 *   3b. (open-issues step) "Thinking…" has a Cancel button; the answer says "list checked
 *       against your data" when code changed the model's list (M5-O2, M5-O3).
 *   4. (Step T, Atlas) ink border, card background, and a mono eyebrow above the text:
 *      "FINDING · N PEOPLE" (teal) or "COULD NOT ANSWER" (red).
 *
 * Guide: §9.6
 */

import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useStore } from '@/store/useStore';

export function AgentAnswer() {
  const busy = useStore((s) => s.agentBusy);
  const answer = useStore((s) => s.agentAnswer);
  const error = useStore((s) => s.agentError);
  const count = useStore((s) => s.highlightIds.size);
  const checked = useStore((s) => s.agentChecked);
  const setAgent = useStore((s) => s.setAgent);
  const clearFocus = useStore((s) => s.clearFocus);

  return (
    // Step 1. Always mounted, so screen readers announce each new answer.
    // Top-left: the corners are outside the rings, so the card never hides who it's about.
    <div aria-live="polite" className="pointer-events-none absolute top-3 left-3 z-10 w-[min(24rem,calc(100%-1.5rem))]">
      {busy ? (
        <div className="pointer-events-auto inline-flex items-center gap-2 rounded-md border bg-background py-1 pr-1 pl-3 text-sm text-muted-foreground shadow-sm">
          Thinking…
          {/* M5-O3: AgentBar aborts the request when busy ends without an answer. */}
          <Button variant="ghost" size="xs" onClick={() => setAgent({ agentBusy: false })}>
            Cancel
          </Button>
        </div>
      ) : answer ? (
        // Step 2
        <div
          className={cn(
            'pointer-events-auto flex items-start gap-2 rounded-md border bg-background px-3 py-2 text-sm shadow-sm',
            error && 'border-destructive text-destructive',
          )}
        >
          <p className="min-w-0 flex-1">
            {answer}
            {!error && count > 1 && <span className="text-muted-foreground"> · {count} people highlighted</span>}
            {!error && checked && <span className="text-muted-foreground"> · list checked against your data</span>}
          </p>
          {/* Step 3 */}
          <Button variant="ghost" size="icon-xs" aria-label="Clear answer" onClick={clearFocus}>
            <X />
          </Button>
        </div>
      ) : null}
    </div>
  );
}
