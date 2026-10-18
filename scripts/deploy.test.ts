// M13 — the deploy files can't drift from the code without a failing test.
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const caddy = read('deploy/Caddyfile');
const unit = read('deploy/connectwork.service');
const csp = /Content-Security-Policy "([^"]+)"/.exec(caddy)?.[1] ?? '';

describe('Caddyfile', () => {
  it("allows the inline theme script by its exact hash (change index.html → update the CSP)", () => {
    const inline = [...read('apps/web/index.html').matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]!);
    expect(inline).toHaveLength(1);
    const hash = createHash('sha256').update(inline[0]!).digest('base64');
    expect(csp).toContain(`'sha256-${hash}'`);
    expect(csp).not.toMatch(/script-src[^;]*'unsafe-inline'/);
  });

  it('lets Google sign-in and the Calendar API through, and nothing else from outside', () => {
    expect(csp).toMatch(/script-src[^;]*https:\/\/accounts\.google\.com/);
    expect(csp).toMatch(/connect-src[^;]*https:\/\/www\.googleapis\.com/);
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(caddy).toContain('Cross-Origin-Opener-Policy "same-origin-allow-popups"');
  });

  it('proxies /api to the port and address the service listens on', () => {
    expect(caddy).toContain('reverse_proxy 127.0.0.1:8787');
    expect(unit).toMatch(/HOST=127\.0\.0\.1 PORT=8787 TRUST_PROXY=1/);
  });
});

describe('connectwork.service', () => {
  it('reads .env as root (EnvironmentFile) and runs unprivileged and hardened', () => {
    expect(unit).toContain('EnvironmentFile=/srv/connectwork/app/.env');
    expect(unit).toContain('User=www-data');
    expect(unit).toContain('NoNewPrivileges=true');
    expect(unit).toContain('ProtectSystem=strict');
  });
});

describe('.env.example', () => {
  it('has no inline comments (systemd would keep them as part of the value)', () => {
    const bad = read('.env.example')
      .split('\n')
      .filter((l) => /^[A-Z_]+=.*\s#/.test(l));
    expect(bad).toEqual([]);
  });
});
