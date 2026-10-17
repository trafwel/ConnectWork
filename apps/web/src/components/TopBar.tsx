/**
 * M1 — Top bar · done
 *
 * WHAT THIS ACHIEVES
 *   The app's header: name, a slot for the agent box and action buttons (filled in
 *   App.tsx), and the Settings button.
 *
 * Guide: §5.5
 */
import { Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useStore } from '@/store/useStore';

export function TopBar({ children }: { children?: React.ReactNode }) {
  const setDialog = useStore((s) => s.setDialog);
  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b bg-card px-4">
      <div className="flex flex-col leading-tight">
        <span className="text-lg font-semibold tracking-tight">Connectwork</span>
        <span className="cw-eyebrow">Map of your people</span>
      </div>
      <div className="flex flex-1 items-center gap-2">{children}</div>
      <Button variant="ghost" size="icon" aria-label="Settings" onClick={() => setDialog('settings', true)}>
        <Settings />
      </Button>
    </header>
  );
}
