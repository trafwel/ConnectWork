import type { Ring } from '@connectwork/shared';
import { cn } from '@/lib/utils';

const LABELS: Record<Ring, string> = { 1: 'Close', 2: 'Regular', 3: 'Wider' };

/** Segmented control for choosing a ring; arrow keys move between options. */
export function RingPicker({ value, onChange, id }: { value: Ring; onChange: (ring: Ring) => void; id?: string }) {
  const rings: Ring[] = [1, 2, 3];
  return (
    <div id={id} role="radiogroup" aria-label="Ring" className="inline-flex rounded-md border p-0.5">
      {rings.map((r) => (
        <button
          key={r}
          type="button"
          role="radio"
          aria-checked={value === r}
          tabIndex={value === r ? 0 : -1}
          onClick={() => onChange(r)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowRight' || e.key === 'ArrowDown') onChange(((r % 3) + 1) as Ring);
            if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') onChange((((r + 1) % 3) + 1) as Ring);
          }}
          className={cn(
            'rounded px-2.5 py-1 text-sm transition-colors',
            value === r ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted',
          )}
        >
          {r} · {LABELS[r]}
        </button>
      ))}
    </div>
  );
}
