/**
 * M16 — Browser side of the texting agent · Owner: Person B · ~1 h
 *
 * WHAT THIS ACHIEVES
 *   The open Connectwork tab becomes the agent's brain: texts relayed from the
 *   server are answered from the user's LOCAL network (IndexedDB), using the same
 *   flows as the app itself — so answers match what the user sees on the map, and
 *   the network never leaves the browser.
 *
 * HOW IT FITS
 *   AgentConnection (Settings) → connectRelay(token) → EventSource on
 *   /api/relay/stream?token=… → each 'request' event → answer(request) → POST /api/relay/reply.
 *   The map also highlights whoever the text was about, so a demo audience sees
 *   the laptop react to the phone.
 *
 * STEPS
 *   1. connectRelay(token): new EventSource(`${API_BASE}/relay/stream?token=${encodeURIComponent(token)}`);
 *      listen for 'request'; parse with RelayRequest (shared schema); ignore invalid events.
 *      Expose status ('connecting' | 'connected' | 'error') for the Settings pill;
 *      EventSource reconnects by itself.
 *   2. answer(req) by intent — reuse existing code, don't duplicate logic:
 *      - query → same as AgentBar: buildSummary + askQuery + exactMatches; reply with the
 *        answer; personIds = matched ids. Keep it SMS-short (≤ 320 chars, names not ids).
 *      - add_person → findMatch first (lib/csv.ts); if new, addPerson({ name, ring: 3,
 *        primaryTag: 'Work' if company else 'Friends', company, role, school, notes: note,
 *        lastContact: today }); reply "Added Sarah Kim (Stripe) to your map."
 *      - remind → resolve personName to one person (exact name, then unique first-name
 *        match); ambiguous → reply asking which one (list up to 3); addReminder(id,
 *        dueDate ?? +7 days, note); reply with the date.
 *      - log_contact → resolve the person; logContact(id, 'message'); "Logged — drift reset for Abbey."
 *      - digest → weeklyCandidates (M8): "3 follow-ups due, 2 people drifting: …" (names only).
 *      - help → a fixed list of what it can do. other → a polite "I can …" fallback.
 *   3. Highlight on the map: setHighlights(personIds) and show the text + reply in the
 *      AgentAnswer card with eyebrow "Texted from iMessage".
 *   4. POST /api/relay/reply { id, text, personIds } with Authorization: Bearer token.
 *   5. notifyOwner(text): POST /api/relay/notify — used by WeeklyReview (M8) for a
 *      "Text me this" button.
 *   6. Writes made from a text are reported back in the reply, so the user always knows
 *      what changed (human oversight for the agent).
 *
 * DONE WHEN
 *   - Texting the five examples (see photon/agent.ts) gives correct replies and the map
 *     updates/highlights live.
 *
 * Contract: RelayRequest / RelayReply · Guide: §23
 */
import type { RelayReply, RelayRequest } from '@connectwork/shared';

export type RelayStatus = 'off' | 'connecting' | 'connected' | 'error';

export function connectRelay(_token: string, _onStatus: (status: RelayStatus) => void): () => void {
  // TODO(M16) step 1 — returns a disconnect function
  return () => {};
}

export async function answer(_request: RelayRequest): Promise<RelayReply> {
  // TODO(M16) steps 2–3
  throw new Error('TODO(M16): answer is not implemented yet');
}

export async function notifyOwner(_token: string, _text: string): Promise<void> {
  // TODO(M16) step 5
  throw new Error('TODO(M16): notifyOwner is not implemented yet');
}
