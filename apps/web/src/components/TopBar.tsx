/**
 * M1 — Top bar · done (theme step T adds the subtitle)
 *
 * WHAT THIS ACHIEVES
 *   The app's header: the name, a slot for the agent box and action buttons
 *   (filled in by App.tsx as milestones land), and the Settings button.
 *
 * STEPS
 *   1. <header className="flex h-14 shrink-0 items-center gap-3 border-b bg-background px-4">
 *   2. Left: "Connectwork" (text-lg font-semibold tracking-tight). Theme step T adds a
 *      mono subtitle under it: <span className="cw-eyebrow">Map of your people</span>.
 *   3. Middle: <div className="flex flex-1 items-center gap-2">{children}</div>.
 *   4. (Declutter 2, Oct 18: the Settings button moved into the one top-bar menu, TopMenu.tsx.)
 *
 * Guide: §5.5
 */
import type { ReactNode } from 'react';

export function TopBar({ children }: { children?: ReactNode }) {
  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b bg-background px-4">
      <span className="text-lg font-semibold tracking-tight">Connectwork</span>
      <div className="flex flex-1 items-center gap-2">{children}</div>
    </header>
  );
}
