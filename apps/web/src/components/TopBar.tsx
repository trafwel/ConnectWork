/**
 * M1 — Top bar · Owner: Person A · ~15 min
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
 *   4. Right: an icon-only Settings button (lucide `Settings`) with aria-label="Settings"
 *      that calls setDialog('settings', true).
 *
 * Guide: §5.5
 */
import type { ReactNode } from 'react';

export function TopBar(_props: { children?: ReactNode }) {
  // TODO(M1) steps 1–4
  return null;
}
