/**
 * Tools menu (Oct 18, team request: "put find hidden links, snap, and the like into one
 * expandable menu")
 *
 * One button next to Settings that opens the less frequent actions, so the top bar keeps room
 * for the search bar and "Review my week". It's a disclosure (a button with aria-expanded and a
 * list of ordinary buttons), not an ARIA menu: Tab and Enter work with no extra key handling,
 * and screen readers announce it as expanded/collapsed. Escape or a click outside closes it.
 */
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Camera, ChevronDown, Plus, Upload, Waypoints } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { findHiddenLinks } from '@/lib/aiFlows';
import { useStore } from '@/store/useStore';

export function ToolsMenu({ onAdd }: { onAdd: () => void }) {
  const setDialog = useStore((s) => s.setDialog);
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => {
      if (!box.current?.contains(e.target as Node)) setOpen(false);
    };
    const key = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      setOpen(false);
      trigger.current?.focus(); // don't drop keyboard users at the top of the page
    };
    document.addEventListener('pointerdown', away);
    document.addEventListener('keydown', key);
    return () => {
      document.removeEventListener('pointerdown', away);
      document.removeEventListener('keydown', key);
    };
  }, [open]);

  const item = (icon: ReactNode, label: ReactNode, run: () => void) => (
    <li>
      <button
        type="button"
        className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted focus-visible:bg-muted focus-visible:outline-none [&_svg]:size-4"
        onClick={() => {
          setOpen(false);
          run();
        }}
      >
        {icon}
        {label}
      </button>
    </li>
  );

  return (
    <div ref={box} className="relative">
      <Button ref={trigger} size="sm" variant="outline" aria-expanded={open} aria-controls="tools-menu" onClick={() => setOpen((o) => !o)}>
        Tools <ChevronDown className={open ? 'rotate-180 transition-transform' : 'transition-transform'} />
      </Button>
      {open && (
        <ul id="tools-menu" className="absolute right-0 top-full z-40 mt-1 w-52 rounded-md border bg-background p-1 shadow-md">
          {item(<Waypoints />, 'Find hidden links', () => void findHiddenLinks())}
          {item(<Camera />, 'Snap', () => setDialog('snap', true))}
          {item(<Upload />, 'Import', () => setDialog('import', true))}
          {item(
            <Plus />,
            <>
              Add person <kbd className="ml-auto text-xs opacity-70">N</kbd>
            </>,
            onAdd,
          )}
        </ul>
      )}
    </div>
  );
}
