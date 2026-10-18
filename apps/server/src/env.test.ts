import { afterEach, describe, expect, it, vi } from 'vitest';

// M13: env.ts reads process.env when imported, so each case imports a fresh copy.
async function load(vars: Record<string, string>) {
  vi.resetModules();
  for (const [k, v] of Object.entries(vars)) vi.stubEnv(k, v);
  return (await import('./env')).env;
}
afterEach(() => vi.unstubAllEnvs());

describe('env fails safe', () => {
  it('counts anything but exactly "paid" as the free tier (fake-data-only guards stay on)', async () => {
    expect((await load({ GEMINI_TIER: 'paid' })).geminiTier).toBe('paid');
    expect((await load({ GEMINI_TIER: 'free            # free | paid' })).geminiTier).toBe('free');
    expect((await load({ GEMINI_TIER: 'paid # oops' })).geminiTier).toBe('free');
  });
  it('turns an unknown DEMO_CACHE into off, and reads HOST', async () => {
    expect((await load({ DEMO_CACHE: 'replay # recorded' })).demoCache).toBe('off');
    expect((await load({ DEMO_CACHE: ' replay ' })).demoCache).toBe('replay');
    expect((await load({ HOST: '127.0.0.1' })).host).toBe('127.0.0.1');
  });
});
