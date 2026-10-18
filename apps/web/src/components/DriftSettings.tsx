/**
 * M10 step 7 — Settings → Drifting: how long before a close person "drifts"
 *
 * WHAT THIS ACHIEVES
 *   90 days for ring 1 and 180 for ring 2 suit a student; someone who sees their close
 *   friends weekly may want 30 / 90. Changing a number here immediately moves and fades
 *   people on the map, updates the Drifting tab, the card, the weekly review and what
 *   Ask Connectwork calls "lost touch".
 *
 * HOW IT FITS
 *   useDriftThresholds() (live from db.meta) → two number inputs → setDriftThresholds()
 *   in db/actions.ts. Drafts live only while typing; a value is saved on blur or Enter, and
 *   only if it's a whole number in range (otherwise the input says why and nothing is saved).
 */
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { setDriftThresholds } from '@/db/actions';
import { isDefaultThresholds, THRESHOLD_MAX, THRESHOLD_MIN } from '@/lib/drift';
import { useDriftThresholds } from '@/lib/useDriftThresholds';

export function DriftSettings() {
  const t = useDriftThresholds();
  const [draft, setDraft] = useState<{ 1?: string; 2?: string }>({});
  const [error, setError] = useState('');

  const save = (ring: 1 | 2) => {
    const raw = draft[ring];
    setDraft((d) => ({ ...d, [ring]: undefined }));
    if (raw === undefined || raw.trim() === String(t[ring])) return;
    const n = Number(raw);
    if (!Number.isInteger(n) || n < THRESHOLD_MIN || n > THRESHOLD_MAX) {
      setError(`Use a whole number of days from ${THRESHOLD_MIN} to ${THRESHOLD_MAX}.`);
      return;
    }
    setError('');
    void setDriftThresholds({ 1: t[1], 2: t[2], [ring]: n } as { 1: number; 2: number });
  };

  const field = (ring: 1 | 2, label: string) => (
    <label className="flex items-center gap-2 text-sm">
      <span className="w-14">{label}</span>
      <Input
        type="number"
        inputMode="numeric"
        min={THRESHOLD_MIN}
        max={THRESHOLD_MAX}
        className="h-8 w-20"
        value={draft[ring] ?? String(t[ring])}
        aria-label={`${label} limit, in days`}
        aria-describedby="drift-help"
        aria-invalid={Boolean(error) || undefined}
        onChange={(e) => setDraft((d) => ({ ...d, [ring]: e.target.value }))}
        onBlur={() => save(ring)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.currentTarget.blur();
        }}
      />
      <span className="text-muted-foreground">days</span>
    </label>
  );

  return (
    <section className="space-y-1.5" aria-labelledby="drift-heading">
      <div className="flex items-center justify-between">
        <h3 id="drift-heading" className="text-sm font-medium">
          Drifting
        </h3>
        {!isDefaultThresholds(t) && (
          <Button
            variant="ghost"
            size="xs"
            onClick={() => {
              setError('');
              void setDriftThresholds(null);
            }}
          >
            Reset to 90 / 180
          </Button>
        )}
      </div>
      <div className="flex flex-wrap gap-x-6 gap-y-2">
        {field(1, 'Ring 1')}
        {field(2, 'Ring 2')}
      </div>
      <p id="drift-help" className="text-xs text-muted-foreground">
        After this long without contact, people fade and move outward on the map. Ring 3 never drifts.
      </p>
      {error && (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
    </section>
  );
}
