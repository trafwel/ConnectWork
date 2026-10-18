/**
 * Step S — Pick-one control (extracted from RingPicker so the keyboard pattern lives once)
 *
 * A proper radio group: arrow keys move the selection AND the focus, and only the selected
 * option is in the Tab order (roving tabindex). Used by RingPicker and Settings → Appearance.
 */
import { useRef } from 'react';
import { cn } from '@/lib/utils';

export function Segmented<T extends string | number>({
  value,
  options,
  onChange,
  label,
  id,
}: {
  value: T;
  options: Array<{ value: T; label: string }>;
  onChange: (value: T) => void;
  /** Accessible name of the group, e.g. "Ring". */
  label: string;
  id?: string;
}) {
  const buttons = useRef(new Map<T, HTMLButtonElement | null>());
  const index = Math.max(0, options.findIndex((o) => o.value === value));

  const move = (delta: number) => {
    const next = options[(index + delta + options.length) % options.length]!.value;
    onChange(next);
    buttons.current.get(next)?.focus(); // focus must follow, or screen readers announce the old option
  };

  return (
    <div
      id={id}
      role="radiogroup"
      aria-label={label}
      className="inline-flex rounded-md border p-0.5"
      onKeyDown={(e) => {
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') move(1);
        else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') move(-1);
        else return;
        e.preventDefault(); // don't scroll the panel
      }}
    >
      {options.map((o) => (
        <button
          key={String(o.value)}
          ref={(el) => {
            buttons.current.set(o.value, el);
          }}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          tabIndex={value === o.value ? 0 : -1}
          onClick={() => onChange(o.value)}
          className={cn(
            'rounded-sm px-2.5 py-1 text-sm transition-colors',
            value === o.value ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
