/**
 * M16 — Settings → Texting agent · done
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

import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { setRelayToken } from '@/db/actions';
import { db } from '@/db/db';
import { startRelay, stopRelay } from '@/lib/relayClient';
import { useStore } from '@/store/useStore';

const STATUS: Record<string, string> = {
  off: 'Off',
  connecting: 'Connecting…',
  connected: 'Connected: texts are answered while this tab is open',
  error: 'Error: check the token (it must match RELAY_TOKEN in the server .env)',
};

export function AgentConnection() {
  const status = useStore((s) => s.relayStatus);
  const saved = useLiveQuery(async () => Boolean((await db.meta.get('relayToken'))?.value), []);
  const [draft, setDraft] = useState('');

  // Step 2.
  const save = async () => {
    const token = draft.trim();
    if (!token) return;
    await setRelayToken(token);
    setDraft('');
    startRelay(token);
  };
  const disconnect = async () => {
    stopRelay();
    await setRelayToken(null);
  };

  return (
    <section className="space-y-1.5" aria-labelledby="texting-heading">
      <h3 id="texting-heading" className="text-sm font-medium">
        Texting agent
      </h3>
      {/* Step 1. A password field: the token is a secret, so it's never shown again once saved. */}
      <div className="flex gap-2">
        <label className="sr-only" htmlFor="relay-token">
          Relay token
        </label>
        <Input
          id="relay-token"
          type="password"
          autoComplete="off"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={saved ? 'Token saved on this device' : 'Paste RELAY_TOKEN from the server .env'}
          className="h-8"
        />
        <Button size="sm" variant="outline" disabled={!draft.trim()} onClick={() => void save()}>
          Save
        </Button>
        {saved && (
          <Button size="sm" variant="ghost" onClick={() => void disconnect()}>
            Disconnect
          </Button>
        )}
      </div>
      {/* Step 3. */}
      <p role="status" className={`text-xs ${status === 'error' ? 'text-destructive' : 'text-muted-foreground'}`}>
        {STATUS[status]}
      </p>
      {/* Step 4. */}
      <p className="text-xs text-muted-foreground">
        Text your Connectwork line: &ldquo;who do I know at…&rdquo;, &ldquo;met…&rdquo;, &ldquo;remind me…&rdquo;, &ldquo;had coffee with…&rdquo;. Only allow-listed numbers get replies,
        and the answers come from this browser&apos;s data.
      </p>
    </section>
  );
}
