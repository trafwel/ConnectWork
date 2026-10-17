/**
 * M16 — Settings → Texting agent · Owner: Person A (UI) · ~25 min
 *
 * WHAT THIS ACHIEVES
 *   One place to switch the texting agent on for this browser: paste the relay
 *   token, see whether the tab is connected, and know what the agent can do.
 *
 * HOW IT FITS
 *   Rendered as a section in SettingsDialog. Saves the token in db.meta
 *   ('relayToken') — it's a local device secret, like a session — and calls
 *   connectRelay (lib/relayClient.ts) on app start when a token is saved.
 *   A small status pill in the TopBar ("Texting · on") shows the connection.
 *
 * STEPS
 *   1. Password-type <input> with a <label> for the token; Save / Disconnect buttons.
 *   2. On save: db.meta.put({ key: 'relayToken', value }); connectRelay(value, setStatus).
 *   3. Status line: Off / Connecting… / Connected (texts are answered while this tab is open) / Error.
 *   4. A short explainer: "Text your Connectwork line: who do I know at…, met…, remind me…".
 *   5. App.tsx: on mount, if a token is saved, connect automatically.
 *
 * DONE WHEN
 *   - After saving the token, the status turns Connected and a test text gets answered.
 *
 * Guide: §23
 */

export function AgentConnection() {
  // TODO(M16) steps 1–5
  return null;
}
