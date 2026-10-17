/**
 * M5 — Demo-mode banner · Owner: Person A · ~10 min
 *
 * WHAT THIS ACHIEVES
 *   Honest about the free tier: Google may use free-tier requests to improve its
 *   products, so the banner says to use sample data only — and says when the AI isn't
 *   configured yet. Disappears with GEMINI_TIER=paid.
 *
 * STEPS
 *   1. On mount: getHealth() into state.
 *   2. Render nothing unless health.tier === 'free'.
 *   3. <div role="note" className="border-b bg-amber-50 px-4 py-1.5 text-center text-xs text-amber-900">
 *        "Demo mode: the AI runs on Gemini's free tier, so use sample data only."
 *        + " AI is not configured yet (no GEMINI_API_KEY)." when !health.aiConfigured
 *
 * Guide: §9.6
 */

export function DemoBanner() {
  // TODO(M5) steps 1–3
  return null;
}
