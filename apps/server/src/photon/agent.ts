/**
 * M16 — Connectwork texting agent on Photon 2.0 · done
 *
 * WHAT THIS ACHIEVES
 *   Connectwork lives where you already talk. Text the agent's iMessage line
 *   (or SMS/WhatsApp/Telegram): "who do I know at Stripe?", "met Sarah Kim from
 *   Stripe at DubHacks", "remind me to follow up with John Friday", "had coffee
 *   with Abbey". It answers and updates your map — your laptop's open Connectwork
 *   tab does the work, so your data never leaves your browser. On Sunday evening
 *   it can text you your weekly review. This is our entry for "Build a Messaging
 *   Agent using Photon 2.0" (must be live on at least one Photon channel).
 *
 * PREREQUISITES (human)
 *   - Photon 2.0 beta account (photon.co/beta, free), a project, and a managed
 *     iMessage line. SPECTRUM_PROJECT_ID / SPECTRUM_PROJECT_SECRET from the
 *     dashboard's Settings → .env. (Beta projects may have ids starting pho_prj_;
 *     see photon.codes/docs/beta/photon.)
 *   - Your own sender id in AGENT_ALLOWED_SENDERS (log `message.sender?.id` once to see it).
 *   - RELAY_TOKEN set in .env and pasted into Settings → Texting agent in the app.
 *
 * HOW IT FITS
 *   index.ts calls startTextingAgent({ generate, hub, memory }) when the Photon
 *   credentials are set. Each text: allow-list → memory recall (M17) →
 *   parseIntent (intent.ts) → hub.ask (relay.ts) → reply → memory save.
 *
 * STEPS
 *   1. `pnpm --filter @connectwork/server add spectrum-ts` (needs TypeScript ≥ 5; we're on 6).
 *      Docs: photon.codes/docs/spectrum-ts/getting-started.
 *   2. Create the app:
 *        const app = await Spectrum({ projectId: env.photonProjectId, projectSecret: env.photonProjectSecret,
 *          providers: [imessage.config()] });   // add terminal.config() to test from your terminal
 *      (import { imessage } from 'spectrum-ts/providers/imessage'; terminal from 'spectrum-ts/providers').
 *   3. Loop: for await (const [space, message] of app.messages) { … } — run it without
 *      awaiting from index.ts so the HTTP server keeps serving; catch and log errors per
 *      message so one bad text never kills the loop.
 *   4. Ignore anything that isn't text (message.content.type !== 'text') with a short
 *      "I can only read text for now." Ignore senders not in env.agentAllowedSenders
 *      entirely (no reply — strangers must learn nothing).
 *   5. context = await deps.memory?.recall(senderId) (M17; undefined without Backboard).
 *   6. intent = await parseIntent(deps.generate, text, context).
 *   7. reply = await deps.hub.ask({ id, platform: message.platform, text, intent, receivedAt }).
 *      null → space.send("Open Connectwork on your laptop and I'll check your network.")
 *   8. Send reply.text followed by "\n— Connectwork (AI)" (transparency: people should know
 *      they're talking to an AI; also a likely VEYZL control).
 *   9. await deps.memory?.save(senderId, text, reply.text) (M17).
 *  10. deps.hub.onNotify(async (text) => …) — text the first allowed sender (weekly digest).
 *      Find how to start an outbound conversation in the Spectrum docs (space for a
 *      phone number); don't guess the API.
 *  11. Log only: platform, intent, latency, ok/error — never message text (personal data).
 *
 * DONE WHEN
 *   - Texting the line from your phone with the app open answers the five examples
 *     correctly, and the map updates for add_person / remind / log_contact.
 *   - With the app closed, the agent replies that it needs the app open.
 *   - Texts from any other number get no reply.
 *
 * Guide: docs/IMPLEMENTATION_GUIDE.md §23
 */
import { randomUUID } from 'node:crypto';
import type { AgentIntent } from '@connectwork/shared';
import { env } from '../env';
import type { Generate } from '../gemini';
import type { AgentMemory } from '../backboard';
import { parseIntent } from './intent';
import type { RelayHub } from './relay';

export interface AgentDeps {
  generate: Generate | null;
  hub: RelayHub;
  /** Backboard conversation memory (M17); undefined when not configured. */
  memory?: AgentMemory;
}

export const SIGNATURE = '\n— Connectwork (AI)';
export const TAB_CLOSED = "Open Connectwork on your laptop and I'll check your network.";

/**
 * Step 4. Is this sender on AGENT_ALLOWED_SENDERS? Phone numbers compare by their last 10 digits,
 * so "+1 (503) …", "+1503…" and an "any;-;+1503…" chat id all match; Apple-ID emails compare
 * case-insensitively.
 */
export function isAllowedSender(senderId: string | undefined, allowed: readonly string[]): boolean {
  if (!senderId) return false;
  const id = senderId.toLowerCase();
  const digits = id.replace(/\D/g, '');
  return allowed.some((a) => {
    const want = a.trim().toLowerCase();
    if (want.includes('@')) return id.includes(want);
    const wantDigits = want.replace(/\D/g, '');
    return wantDigits.length >= 7 && digits.length >= 7 && digits.slice(-10) === wantDigits.slice(-10);
  });
}

/** Only the last 4 digits, so the log helps set up the allow-list without recording a number. */
const masked = (id?: string) => (id ? `…${id.replace(/\D/g, '').slice(-4) || 'email'}` : 'unknown');

export async function startTextingAgent(deps: AgentDeps): Promise<void> {
  // Steps 1–2. Imported here, not at the top: only a server with Photon credentials loads the SDK.
  const { Spectrum } = await import('spectrum-ts');
  const { imessage } = await import('spectrum-ts/providers/imessage');
  const app = await Spectrum({
    projectId: env.photonProjectId,
    projectSecret: env.photonProjectSecret,
    providers: [imessage.config()],
  });
  console.log(`Texting agent on Photon (iMessage): ${env.agentAllowedSenders.length} allowed sender(s), replies come from the open Connectwork tab`);

  // Step 10. Text the owner (first allowed sender), e.g. the weekly digest from the browser.
  const owner = env.agentAllowedSenders[0];
  if (owner) {
    deps.hub.onNotify(async (text) => {
      const im = imessage(app);
      const space = await im.space.create(await im.user(owner));
      await space.send(text + SIGNATURE);
    });
  }

  // Step 3. One bad text must never stop the loop.
  for await (const [space, message] of app.messages) {
    const started = Date.now();
    try {
      // Step 4. Strangers learn nothing: no reply at all. Read receipts and the like are ignored.
      if (message.content.type !== 'text') continue;
      if (!isAllowedSender(message.sender?.id, env.agentAllowedSenders)) {
        console.log(`agent: ignored a text from a sender not on AGENT_ALLOWED_SENDERS (${masked(message.sender?.id)})`);
        continue;
      }
      const text = message.content.text.slice(0, 2000);
      const senderId = message.sender!.id;
      // Steps 5–6.
      const context = await deps.memory?.recall(senderId);
      const intent: AgentIntent = deps.generate ? await parseIntent(deps.generate, text, context) : { intent: 'query', question: text };
      // Step 7.
      const reply = await deps.hub.ask({ id: randomUUID(), platform: message.platform, text, intent, receivedAt: new Date().toISOString() });
      // Step 8. Always signed: people should know they're talking to an AI.
      const out = reply ? reply.text : TAB_CLOSED;
      await space.send(out + SIGNATURE);
      // Step 9.
      if (reply) await deps.memory?.save(senderId, text, reply.text);
      // Step 11. Never the text.
      console.log(`agent: ${message.platform} ${intent.intent} ${reply ? 'answered by tab' : 'no tab open'} ${Date.now() - started}ms`);
    } catch (e) {
      console.error(`agent: error after ${Date.now() - started}ms: ${e instanceof Error ? e.message : 'unknown'}`);
    }
  }
}
