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
  /** Used once when the main model is overloaded, times out or is rate limited. Empty disables it. */
  geminiFallbackModel: process.env.GEMINI_FALLBACK_MODEL ?? 'gemini-3.6-flash',
  geminiTier: (process.env.GEMINI_TIER ?? 'free') as 'free' | 'paid',
  allowedOrigin: process.env.ALLOWED_ORIGIN ?? 'http://localhost:5173',
  port: Number(process.env.PORT ?? 8787),
  demoCache: (process.env.DEMO_CACHE ?? 'off') as 'off' | 'record' | 'replay',
};
