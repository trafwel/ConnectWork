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
 *   4. Right: an icon-only Settings button (lucide `Settings`) with aria-label="Settings"
 *      that calls setDialog('settings', true).
 *
 * Guide: §5.5
 */
import type { ReactNode } from 'react';
import { Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useStore } from '@/store/useStore';

export function TopBar({ children }: { children?: ReactNode }) {
  const setDialog = useStore((s) => s.setDialog);
  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b bg-background px-4">
      <span className="text-lg font-semibold tracking-tight">Connectwork</span>
      <div className="flex flex-1 items-center gap-2">{children}</div>
      <Button variant="ghost" size="icon" aria-label="Settings" onClick={() => setDialog('settings', true)}>
        <Settings />
      </Button>
    </header>
  );
}
