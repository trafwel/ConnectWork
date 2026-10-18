/**
 * M0 — Server configuration · done
 *
 * WHAT THIS ACHIEVES
 *   Reads secrets and settings from the repo-root .env (never committed) into one
 *   typed object, with safe defaults so the app runs even before a key is added.
 *
 * HOW IT FITS
 *   app.ts and index.ts read `env`. The Gemini key lives only here, on the server.
 *
 * HOW IT WAS BUILT
 *   1. process.loadEnvFile() on ../../../.env (Node's built-in loader), wrapped in try.
 *   2. Real environment variables win over .env (useful on the VM).
 *   3. Defaults: model gemini-3.8-flash, fallback gemini-3.6-flash, tier free, cache off.
 *
 * DONE WHEN
 *   - /api/health reports the model, fallback, tier and whether AI is configured.
 *
 * Gotcha: .env is read only at startup — restart `pnpm dev` after editing it.
 * Guide: §4.3, §1.3
 */
import { fileURLToPath } from 'node:url';

// Load the repo-root .env if present; real env vars win.
try {
  process.loadEnvFile(fileURLToPath(new URL('../../../.env', import.meta.url)));
} catch {
  // no .env file: rely on the process environment
}

export const env = {
  geminiApiKey: process.env.GEMINI_API_KEY ?? '',
  geminiModel: process.env.GEMINI_MODEL ?? 'gemini-3.8-flash',
  /**
   * Tried in order when the main model is overloaded, times out or is rate limited.
   * GEMINI_FALLBACK_MODELS is a comma list; the older single GEMINI_FALLBACK_MODEL still
   * works; an empty value disables fallback.
   */
  geminiFallbackModels: (process.env.GEMINI_FALLBACK_MODELS ?? process.env.GEMINI_FALLBACK_MODEL ?? 'gemini-3.6-flash,gemini-3.5-flash-lite')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
  // M13: fail safe. Anything but exactly "paid" counts as free, so the fake-data-only guards stay on
  // (e.g. a systemd EnvironmentFile keeps an inline "# comment" as part of the value).
  geminiTier: (process.env.GEMINI_TIER?.trim() === 'paid' ? 'paid' : 'free') as 'free' | 'paid',
  allowedOrigin: process.env.ALLOWED_ORIGIN ?? 'http://localhost:5173',
  port: Number(process.env.PORT ?? 8787),
  /**
   * M13: which network address to listen on. Unset = all of them (fine for local dev). On the VM it is
   * 127.0.0.1, so the API is reachable ONLY through Caddy: with TRUST_PROXY=1, a directly reachable
   * port would let anyone fake X-Forwarded-For and dodge the rate limit.
   */
  host: process.env.HOST || undefined,
  /** Trust X-Forwarded-For only behind our own proxy (Caddy, M13); otherwise anyone could fake their IP. */
  trustProxy: process.env.TRUST_PROXY === '1',
  demoCache: (['record', 'replay'].includes(process.env.DEMO_CACHE?.trim() ?? '') ? process.env.DEMO_CACHE!.trim() : 'off') as 'off' | 'record' | 'replay',
  // Side tracks — each feature stays off until its variables are set.
  photonProjectId: process.env.SPECTRUM_PROJECT_ID ?? '',
  photonProjectSecret: process.env.SPECTRUM_PROJECT_SECRET ?? '',
  /** Only these sender ids may talk to the agent; strangers texting the number are ignored. */
  agentAllowedSenders: (process.env.AGENT_ALLOWED_SENDERS ?? '').split(',').map((s) => s.trim()).filter(Boolean),
  relayToken: process.env.RELAY_TOKEN ?? '',
  /**
   * M16: run the texting agent in THIS server (default yes when Photon is configured). Set
   * TEXTING_AGENT=0 on a second server that reads the same .env (e.g. the laptop tunnel), or two
   * servers would compete for the same texts.
   */
  textingAgent: process.env.TEXTING_AGENT?.trim() !== '0',
  backboardApiKey: process.env.BACKBOARD_API_KEY ?? '',
  backboardAssistantId: process.env.BACKBOARD_ASSISTANT_ID ?? '',
  veyzlApiKey: process.env.VEYZL_API_KEY ?? '',
};
