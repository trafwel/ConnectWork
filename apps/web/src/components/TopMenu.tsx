/**
 * Declutter 2 (Oct 18) — the top bar's one menu
 *
 * WHAT THIS ACHIEVES
 *   The top bar used to hold ten controls (four view tabs, Review my week, Find hidden
 *   links, Snap, Import, Add, Settings) next to the Ask box. Now it holds the Ask box and
 *   ONE "Menu" button; every one of those actions lives inside it, grouped by what you're
 *   trying to do. Nothing was removed, only moved.
 *
 * HOW IT FITS
 *   App.tsx renders it in <TopBar>. Each item calls the same store action or flow the old
 *   button did (setView, setWeeklyOpen, findHiddenLinks, setDialog), so nothing downstream
 *   changed. N still opens Quick add from anywhere (useHotkey in App).
 *
 * WHY Base UI Menu
 *   It's already installed (it powers our Select), so no new dependency (SPEC §3). It gives a
 *   real ARIA menu for free: Enter/Space/↓ opens it, arrow keys move, typing a letter jumps,
 *   Escape closes and focus returns to the button.
 */
import { Menu } from '@base-ui/react/menu';
import { CalendarCheck, Camera, Check, ChevronDown, Menu as MenuIcon, Plus, Settings, Upload, Waypoints } from 'lucide-react';
import type { ReactNode } from 'react';
import { buttonVariants } from '@/components/ui/button';
import { findHiddenLinks } from '@/lib/aiFlows';
import { cn } from '@/lib/utils';
import { useStore, type UIState } from '@/store/useStore';

type View = UIState['view'];
const VIEWS: Array<{ value: View; label: string }> = [
  { value: 'map', label: 'Map' },
  { value: 'groups', label: 'Groups' },
  { value: 'list', label: 'List (accessible table)' },
  { value: 'month', label: 'Month' },
];

const itemClass =
  'flex w-full cursor-default items-center gap-2 rounded-md px-2 py-1.5 text-sm outline-hidden select-none data-highlighted:bg-accent data-highlighted:text-accent-foreground [&_svg]:size-4 [&_svg]:shrink-0';

export function TopMenu({ onAdd }: { onAdd: () => void }) {
  const view = useStore((s) => s.view);
  const setView = useStore((s) => s.setView);
  const setWeeklyOpen = useStore((s) => s.setWeeklyOpen);
  const setDialog = useStore((s) => s.setDialog);

  return (
    <Menu.Root>
      <Menu.Trigger className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'shrink-0')}>
        <MenuIcon /> Menu <ChevronDown className="opacity-60" />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner sideOffset={6} align="end" className="isolate z-50">
          <Menu.Popup className="min-w-60 origin-(--transform-origin) rounded-lg bg-popover p-1 text-popover-foreground shadow-md ring-1 ring-foreground/10 outline-none data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95">
            <Section label="AI">
              <Item icon={<CalendarCheck />} onClick={() => setWeeklyOpen(true)}>
                Review my week
              </Item>
              <Item icon={<Waypoints />} onClick={() => void findHiddenLinks()}>
                Find hidden links
              </Item>
            </Section>
            <Separator />
            <Section label="Add people">
              <Item icon={<Plus />} onClick={onAdd} shortcut="N">
                Add someone
              </Item>
              <Item icon={<Camera />} onClick={() => setDialog('snap', true)}>
                Snap a card or roster
              </Item>
              <Item icon={<Upload />} onClick={() => setDialog('import', true)}>
                Import LinkedIn CSV
              </Item>
            </Section>
            <Separator />
            {/* A radio group, so screen readers hear which view is on ("Map, checked"). */}
            <Menu.RadioGroup value={view} onValueChange={(v: View) => setView(v)}>
              <Menu.GroupLabel className="px-2 pt-1 pb-0.5 text-xs text-muted-foreground">View</Menu.GroupLabel>
              {VIEWS.map((v) => (
                <Menu.RadioItem key={v.value} value={v.value} className={itemClass} closeOnClick>
                  <span className="grid size-4 place-items-center">
                    <Menu.RadioItemIndicator>
                      <Check />
                    </Menu.RadioItemIndicator>
                  </span>
                  {v.label}
                </Menu.RadioItem>
              ))}
            </Menu.RadioGroup>
            <Separator />
            <Item icon={<Settings />} onClick={() => setDialog('settings', true)}>
              Settings
            </Item>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}

function Section({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Menu.Group>
      <Menu.GroupLabel className="px-2 pt-1 pb-0.5 text-xs text-muted-foreground">{label}</Menu.GroupLabel>
      {children}
    </Menu.Group>
  );
}

function Item({ icon, onClick, shortcut, children }: { icon: ReactNode; onClick: () => void; shortcut?: string; children: ReactNode }) {
  return (
    <Menu.Item className={itemClass} onClick={onClick} aria-keyshortcuts={shortcut}>
      {icon}
      <span className="flex-1">{children}</span>
      {shortcut && <kbd className="text-xs text-muted-foreground">{shortcut}</kbd>}
    </Menu.Item>
  );
}

function Separator() {
  return <Menu.Separator className="-mx-1 my-1 h-px bg-border" />;
}
