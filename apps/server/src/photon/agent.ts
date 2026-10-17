/**
 * M16 — Connectwork texting agent on Photon 2.0 · Owner: Person B · ~1.5 h
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
import type { Generate } from '../gemini';
import type { AgentMemory } from '../backboard';
import type { RelayHub } from './relay';

export interface AgentDeps {
  generate: Generate | null;
  hub: RelayHub;
  /** Backboard conversation memory (M17); undefined when not configured. */
  memory?: AgentMemory;
}

export async function startTextingAgent(_deps: AgentDeps): Promise<void> {
  // TODO(M16) steps 1–11
  throw new Error('TODO(M16): startTextingAgent is not implemented yet');
}
