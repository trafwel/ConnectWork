import { readFileSync } from 'node:fs';
import { createServer } from 'node:net';
import { describe, expect, it } from 'vitest';
import { nodeMessage, nodeOk, portBusyMessage, portFree, whoHolds } from './check-dev.mjs';

describe('check-dev: Node version', () => {
  it('accepts 22.13+, 24 and 26+, and refuses the rest', () => {
    const ok = ['22.13.0', '22.20.1', 'v24.0.0', '24.11.0', '26.8.2', '27.0.0'];
    const bad = ['18.20.0', '20.19.0', '21.7.3', '22.12.0', '23.11.0', '25.1.0'];
    for (const v of ok) expect(nodeOk(v), v).toBe(true);
    for (const v of bad) expect(nodeOk(v), v).toBe(false);
  });

  it('matches package.json "engines" (so the two can never drift apart)', () => {
    const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')) as { engines: { node: string } };
    expect(pkg.engines.node).toBe('^22.13.0 || ^24.0.0 || >=26.0.0');
  });

  it('explains how to upgrade, using the version pinned in .nvmrc', () => {
    const msg = nodeMessage('18.20.0');
    expect(msg).toContain('You have Node 18.20.0');
    expect(msg).toContain('nvm install 26');
  });
});

describe('check-dev: busy port', () => {
  it('sees a port that is taken, and frees up after', async () => {
    const holder = createServer();
    await new Promise<void>((r) => holder.listen(0, r));
    const port = (holder.address() as { port: number }).port;
    expect(await portFree(port)).toBe(false);
    expect(whoHolds(port)).toMatch(new RegExp(`^PID ${process.pid}\\b`));
    await new Promise<void>((r) => holder.close(() => r()));
    expect(await portFree(port)).toBe(true);
  });

  it('says what to do, per platform', () => {
    expect(portBusyMessage(8787, 'PID 42 (node tsx watch)', 'darwin')).toContain('Port 8787 is already in use by PID 42');
    expect(portBusyMessage(8787, '', 'darwin')).toContain('kill <pid>');
    expect(portBusyMessage(8787, '', 'win32')).toContain('taskkill /PID <pid> /F');
  });
});
