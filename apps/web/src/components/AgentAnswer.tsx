/**
 * M5 — The agent's answer card · done
 *
 * WHAT THIS ACHIEVES
 *   Shows "Thinking…", then the one-line answer and how many people are
 *   highlighted, or a clear error. It sits in an aria-live region, so screen
 *   readers announce answers too.
 *
 * Guide: §9.6
 */
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useStore } from '@/store/useStore';

/** The agent's one-line answer, announced to screen readers. */
export function AgentAnswer() {
  const answer = useStore((s) => s.agentAnswer);
  const isError = useStore((s) => s.agentError);
  const busy = useStore((s) => s.agentBusy);
  const count = useStore((s) => s.highlightIds.size);
  const clearFocus = useStore((s) => s.clearFocus);

  return (
    <div aria-live="polite" className="pointer-events-none absolute top-3 left-1/2 z-10 w-full max-w-xl -translate-x-1/2 px-4">
      {busy ? (
        <p className="pointer-events-auto rounded-lg border bg-background/95 px-4 py-3 text-sm text-muted-foreground shadow-sm">Thinking…</p>
      ) : answer ? (
        <div
          className={cn(
            'pointer-events-auto flex items-start gap-3 rounded-lg border bg-background/95 px-4 py-3 text-sm shadow-sm',
            isError && 'border-destructive/40 text-destructive',
          )}
        >
          <p className="flex-1">
            {answer}
            {!isError && count > 1 && <span className="text-muted-foreground"> · {count} people highlighted</span>}
          </p>
          <Button variant="ghost" size="icon-xs" aria-label="Clear answer" onClick={clearFocus}>
            <X />
          </Button>
        </div>
      ) : null}
    </div>
  );
}
