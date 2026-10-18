/**
 * M3 — Ring picker · done
 *
 * WHAT THIS ACHIEVES
 *   Choosing Close / Regular / Wider with mouse or keyboard — a proper radio group,
 *   which is what screen readers expect for "pick one of three".
 *
 * STEPS
 *   1. <div role="radiogroup" aria-label="Ring"> with three <button type="button" role="radio">,
 *      labelled "1 · Close", "2 · Regular", "3 · Wider".
 *   2. aria-checked={value === r}; roving tabIndex: 0 for the selected button, -1 for the others.
 *   3. Arrow keys move the selection: Right/Down → (r % 3) + 1; Left/Up → ((r + 1) % 3) + 1.
 *   4. Selected style: bg-primary text-primary-foreground; others muted with a hover background.
 *
 * Guide: §7.2
 */
import { useRef } from 'react';
import type { Ring } from '@connectwork/shared';
import { cn } from '@/lib/utils';

const OPTIONS: Array<{ ring: Ring; label: string }> = [
  { ring: 1, label: '1 · Close' },
  { ring: 2, label: '2 · Regular' },
  { ring: 3, label: '3 · Wider' },
];

export function RingPicker({ value, onChange, id }: { value: Ring; onChange: (ring: Ring) => void; id?: string }) {
  const buttons = useRef<Record<Ring, HTMLButtonElement | null>>({ 1: null, 2: null, 3: null });

  // Step 3. Arrow keys move the selection AND the focus (focus must follow, or the
  // screen reader keeps announcing the old option).
  const move = (to: Ring) => {
    onChange(to);
    buttons.current[to]?.focus();
  };

  return (
    <div
      id={id}
      role="radiogroup"
      aria-label="Ring"
      className="inline-flex rounded-md border p-0.5"
      onKeyDown={(e) => {
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') move(((value % 3) + 1) as Ring);
        else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') move((((value + 1) % 3) + 1) as Ring);
        else return;
        e.preventDefault(); // don't scroll the panel
      }}
    >
      {OPTIONS.map(({ ring, label }) => (
        <button
          key={ring}
          ref={(el) => {
            buttons.current[ring] = el;
          }}
          type="button"
          role="radio"
          aria-checked={value === ring}
          tabIndex={value === ring ? 0 : -1} // Step 2: roving tabindex, one Tab stop for the group
          onClick={() => onChange(ring)}
          className={cn(
            'rounded-sm px-2.5 py-1 text-sm transition-colors',
            value === ring ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted',
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
