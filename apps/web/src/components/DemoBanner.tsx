/**
 * M5 — Demo-mode banner · done
 *
 * WHAT THIS ACHIEVES
 *   Honest about the free tier: Google may use free-tier requests to improve its
 *   products, so the banner says to use sample data only — and says when the AI isn't
 *   configured yet. Disappears with GEMINI_TIER=paid.
 *
 * STEPS
 *   1. On mount: getHealth() into state.
 *   2. Render nothing unless health.tier === 'free'.
 *   3. <div role="note" className="border-b bg-amber-50 px-4 py-1.5 text-center text-xs text-amber-900 dark:bg-amber-950 dark:text-amber-100">
 *        "Demo mode: the AI runs on Gemini's free tier, so use sample data only."
 *        + " AI is not configured yet (no GEMINI_API_KEY)." when !health.aiConfigured
 *
 * Guide: §9.6
 */

import { useEffect, useState } from 'react';
import { getHealth, type Health } from '@/lib/api';

export function DemoBanner() {
  const [health, setHealth] = useState<Health | null>(null);
  // Step 1
  useEffect(() => {
    let alive = true;
    void getHealth().then((h) => alive && setHealth(h));
    return () => {
      alive = false;
    };
  }, []);

  // Step 2
  if (health?.tier !== 'free') return null;
  // Step 3
  return (
    <div role="note" className="border-b bg-amber-50 px-4 py-1.5 text-center text-xs text-amber-900 dark:bg-amber-950 dark:text-amber-100">
      Demo mode: the AI runs on Gemini&apos;s free tier, so use sample data only.
      {!health.aiConfigured && ' AI is not configured yet (no GEMINI_API_KEY).'}
    </div>
  );
}
