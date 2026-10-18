/**
 * Pre-flight for `pnpm dev` · added Oct 17 (a teammate's `pnpm dev` failed with only
 * "ERR_PNPM_RECURSIVE_RUN_FIRST_FAIL")
 *
 * WHAT THIS ACHIEVES
 *   Turns the two most common setup failures into plain instructions BEFORE anything starts:
 *   1. A Node version our tools don't support (they crash with cryptic errors).
 *   2. The API port (8787) already taken — usually an earlier `pnpm dev` still running —
 *      which otherwise ends in a stack trace and pnpm's one-line summary.
 *
 * HOW IT FITS
 *   package.json: "dev": "node scripts/check-dev.mjs && pnpm --parallel …". Plain JavaScript
 *   with no dependencies and nothing newer than ES2020 syntax, so any Node from 14 up can run it
 *   and explain the problem instead of crashing.
 *   The supported range must match "engines" in package.json (a test checks they agree).
 *   apps/server/src/index.ts prints the same port message if the port is taken later.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { createServer } from 'node:net';
import { pathToFileURL } from 'node:url';

/** Same as package.json "engines.node": ^22.13.0 || ^24.0.0 || >=26.0.0 (from vitest, eslint, vite). */
export const NODE_RANGE_TEXT = 'Node 22.13 or newer 22.x, Node 24, or Node 26+';

export function nodeOk(version) {
  const [major, minor] = String(version).replace(/^v/, '').split('.').map(Number);
  if (major === 22) return minor >= 13;
  return major === 24 || major >= 26;
}

/** Resolves true if nothing is listening on `port`. */
export function portFree(port) {
  return new Promise((resolve) => {
    const probe = createServer();
    probe.once('error', () => resolve(false));
    probe.once('listening', () => probe.close(() => resolve(true)));
    probe.listen(port);
  });
}

/** "PID 1234 (node …)" for whoever listens on `port`, or '' when that can't be found out. */
export function whoHolds(port) {
  try {
    if (process.platform === 'win32') {
      const out = execFileSync('netstat', ['-ano', '-p', 'tcp'], { encoding: 'utf8' });
      const line = out.split('\n').find((l) => l.includes(`:${port} `) && /LISTENING/i.test(l));
      const pid = line && line.trim().split(/\s+/).pop();
      return pid ? `PID ${pid}` : '';
    }
    const pid = execFileSync('lsof', ['-nP', `-iTCP:${port}`, '-sTCP:LISTEN', '-t'], { encoding: 'utf8' }).trim().split('\n')[0];
    if (!pid) return '';
    // The program's short name ("node"), not its full command line (a long, cut-off path).
    const cmd = execFileSync('ps', ['-o', 'comm=', '-p', pid], { encoding: 'utf8' }).trim().split('/').pop();
    return `PID ${pid}${cmd ? ` (${cmd})` : ''}`;
  } catch {
    return '';
  }
}

export function portBusyMessage(port, holder, platform = process.platform) {
  const stop = platform === 'win32' ? `taskkill /PID <pid> /F` : `kill <pid>`;
  return [
    `✖ Port ${port} is already in use${holder ? ` by ${holder}` : ''}.`,
    `  That's usually an earlier \`pnpm dev\` that is still running (another terminal or tab).`,
    `  Stop it there with Ctrl+C, or stop it by its process id: ${stop}`,
    `  Find it with: ${platform === 'win32' ? `netstat -ano | findstr :${port}` : `lsof -nP -iTCP:${port} -sTCP:LISTEN`}`,
    `  Then run \`pnpm dev\` again.`,
  ].join('\n');
}

export function nodeMessage(version) {
  let pinned = '';
  try {
    pinned = readFileSync(new URL('../.nvmrc', import.meta.url), 'utf8').trim();
  } catch {
    // no .nvmrc: fine
  }
  return [
    `✖ Connectwork needs ${NODE_RANGE_TEXT}. You have Node ${version}.`,
    `  With nvm: nvm install${pinned ? ` ${pinned}` : ''} && nvm use${pinned ? ` ${pinned}` : ''}   (the repo's .nvmrc says ${pinned || 'which version we use'})`,
    `  With Homebrew: brew upgrade node   ·   Or download it from https://nodejs.org`,
    `  Then run \`pnpm install\` and \`pnpm dev\` again.`,
  ].join('\n');
}

async function main() {
  const problems = [];
  if (!nodeOk(process.versions.node)) problems.push(nodeMessage(process.versions.node));

  const apiPort = Number(process.env.PORT || 8787);
  if (!(await portFree(apiPort))) problems.push(portBusyMessage(apiPort, whoHolds(apiPort)));

  // Vite moves to the next free port by itself, so 5173 being taken is only a heads-up.
  if (!(await portFree(5173))) console.warn('ℹ Port 5173 is taken, so the web app will open on another port (Vite prints the address).');

  if (problems.length) {
    console.error('\n' + problems.join('\n\n') + '\n');
    process.exit(1);
  }
}

// Run only when executed (`node scripts/check-dev.mjs`), not when imported by a test.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
