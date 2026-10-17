/**
 * M17 — Backboard conversation memory for the texting agent · Owner: Person B · ~45 min · OPTIONAL
 *
 * WHAT THIS ACHIEVES
 *   AI APIs forget everything between calls. With Backboard, the texting agent
 *   remembers the conversation: text "met Sarah Kim from Stripe" and later
 *   "remind me to follow up with her Friday" — "her" resolves to Sarah. It turns
 *   one-off commands into a conversation. Our entry for MLH "Best Use of Backboard".
 *
 * SCOPE — PRIVACY BOUNDARY
 *   Backboard stores ONLY the texting conversation (what the user texted and what
 *   the agent replied). The network itself — people, notes, links — never goes to
 *   Backboard; it stays in the browser. Off unless BACKBOARD_API_KEY is set.
 *   Use with the fictional demo data only (it is a third-party store).
 *
 * HOW IT FITS
 *   index.ts creates `backboardMemory()` when configured and passes it to
 *   startTextingAgent (photon/agent.ts): recall() before parsing a text, save() after replying.
 *
 * STEPS
 *   1. `pnpm --filter @connectwork/server add backboard-sdk` and read
 *      docs.backboard.io/sdk/quickstart and /sdk/memory. Memory is kept per ASSISTANT
 *      (reuse BACKBOARD_ASSISTANT_ID); threads hold conversations. Create the assistant
 *      once (dashboard or SDK) and put its id in .env.
 *   2. One thread per sender id: keep a Map<senderId, threadId> in memory (recreated on
 *      restart is fine; Backboard memory persists per assistant anyway).
 *   3. recall(senderId): return the last few turns / relevant memories as plain text
 *      lines ("User: …", "Agent: …"), ≤ ~1,000 characters. Use memory mode "Readonly".
 *   4. save(senderId, userText, agentReply): add both messages to the sender's thread
 *      with memory mode "Auto" so Backboard extracts and stores what matters.
 *   5. Every call has a short timeout (5 s) and fails soft: on any error recall()
 *      returns undefined and save() does nothing — memory must never break the agent.
 *   6. Settings/health: add `backboard: Boolean(env.backboardApiKey)` to /api/health.
 *   7. Live check: "met Sarah Kim from Stripe" → "remind me to follow up with her Friday"
 *      creates a reminder for Sarah Kim.
 *
 * DONE WHEN
 *   - Pronouns resolve across texts; with Backboard off, the agent still works
 *     (it just can't resolve "her").
 *
 * Guide: docs/IMPLEMENTATION_GUIDE.md §24
 */
import { env } from './env';

export interface AgentMemory {
  /** Recent conversation for this sender as plain text, or undefined. */
  recall(senderId: string): Promise<string | undefined>;
  /** Store one exchange. Must never throw. */
  save(senderId: string, userText: string, agentReply: string): Promise<void>;
}

export function backboardMemory(): AgentMemory | undefined {
  if (!env.backboardApiKey || !env.backboardAssistantId) return undefined;
  // TODO(M17) steps 1–5: return { recall, save } backed by backboard-sdk
  return undefined;
}
