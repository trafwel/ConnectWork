/**
 * M5 — Demo-mode banner · done
 *
 * WHAT THIS ACHIEVES
 *   Honest about the free tier: Google may use free-tier requests to improve its
 *   products, so the banner says to use sample data only, and says when the AI
 *   isn't configured yet. Disappears with GEMINI_TIER=paid.
 *
 * Guide: §9.6
 */
import { useEffect, useState } from 'react';
import { getHealth, type Health } from '@/lib/api';

/** Free-tier Gemini may use requests to improve Google's products: sample data only. */
export function DemoBanner() {
  const [health, setHealth] = useState<Health | null>(null);
  useEffect(() => {
    getHealth().then(setHealth);
  }, []);
  if (!health || health.tier !== 'free') return null;
  return (
    <div role="note" className="border-b bg-amber-50 px-4 py-1.5 text-center text-xs text-amber-900">
      Demo mode: the AI runs on Gemini's free tier, so use sample data only.
      {!health.aiConfigured && ' AI is not configured yet (no GEMINI_API_KEY).'}
    </div>
  );
}
