import { Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useStore } from '@/store/useStore';

export function TopBar({ children }: { children?: React.ReactNode }) {
  const setDialog = useStore((s) => s.setDialog);
  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b bg-background px-4">
      <div className="flex items-baseline gap-2">
        <span className="text-lg font-semibold tracking-tight">Connectwork</span>
      </div>
      <div className="flex flex-1 items-center gap-2">{children}</div>
      <Button variant="ghost" size="icon" aria-label="Settings" onClick={() => setDialog('settings', true)}>
        <Settings />
      </Button>
    </header>
  );
}
