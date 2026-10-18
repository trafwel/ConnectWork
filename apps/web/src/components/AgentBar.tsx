/**
 * M5 — Ask Connectwork (the agent box) · done
 *
 * WHAT THIS ACHIEVES
 *   The agent's front door: type a question, and the answer lights up the right
 *   people on the map (and opens their card when there's exactly one).
 *
 * HOW IT FITS
 *   Builds the summary from Dexie (lib/graphSummary.ts) → askQuery (lib/api.ts) →
 *   sets the answer, highlights and filter hint in the store → RingMap and AgentAnswer
 *   react. Lives centered in the top bar.
 *
 * STEPS
 *   1. <form role="search" onSubmit={ask}> with an <Input aria-label="Ask Connectwork about
 *      your network" placeholder="Ask Connectwork… e.g. Who do I know at Microsoft?">, a
 *      decorative sparkle icon (aria-hidden), and a spinner while busy.
 *   2. ask(): ignore empty input; a request in flight is CANCELLED and replaced (open-issues
 *      step, M5-O3: Escape, the card's Cancel, or a new question abort it); clearFocus();
 *      setAgent({ agentBusy: true, agentAnswer: null, agentError: false }).
 *   3. Load people, links, reminders from Dexie (Promise.all) and call
 *      askQuery(question, buildSummary(people, links, reminders)).
 *   4. Error → setAgent({ agentBusy: false, agentAnswer: result.message, agentError: true }).
 *   5. Success → ids = model ids that exist locally (grounded, see exactMatch.ts) ∪ exactMatches(question, people);
 *      for filterHint 'drifting' the ids come from driftLevel() instead (M5 review);
 *      setAgent({ agentBusy: false, agentAnswer: answer }); setHighlights(ids);
 *      if filterHint !== 'none' → setFilter(filterHint) (M7: the drifting set is real now);
 *      if exactly one id → selectPerson(id).
 *   6. Escape in the input clears the text and calls clearFocus().
 *
 * DONE WHEN
 *   - "Who do I know at Microsoft?" highlights every Microsoft person and dims the rest.
 *
 * Guide: §9.6
 */

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Loader2, Sparkles } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { db } from '@/db/db';
import { cleanEdits } from '@connectwork/shared';
import { askQuery } from '@/lib/api';
import { proposeEdits } from '@/lib/networkEdits';
import { textOwner } from '@/lib/relayClient';
import { asksForText } from '@/lib/textAgent';
import { driftLevel, isDefaultThresholds } from '@/lib/drift';
import { readDriftThresholds } from '@/lib/useDriftThresholds';
import { answerIds } from '@/lib/exactMatch';
import { buildSummary } from '@/lib/graphSummary';
import { useStore } from '@/store/useStore';

export function AgentBar() {
  const [question, setQuestion] = useState('');
  const busy = useStore((s) => s.agentBusy);
  const setAgent = useStore((s) => s.setAgent);
  const setHighlights = useStore((s) => s.setHighlights);
  const setFilter = useStore((s) => s.setFilter);
  const selectPerson = useStore((s) => s.selectPerson);
  const clearFocus = useStore((s) => s.clearFocus);
  /** The question in flight, so it can be cancelled (M5-O3). */
  const pending = useRef<AbortController | null>(null);

  // Anything that ends "busy" without an answer (the card's Cancel, Escape) aborts the request.
  useEffect(
    () =>
      useStore.subscribe((s, prev) => {
        if (prev.agentBusy && !s.agentBusy && pending.current) {
          pending.current.abort();
          pending.current = null;
        }
      }),
    [],
  );

  // Step 2
  const ask = async (e: FormEvent) => {
    e.preventDefault();
    const q = question.trim();
    if (!q) return;
    pending.current?.abort(); // a new question replaces the one in flight
    const controller = new AbortController();
    pending.current = controller;
    clearFocus();
    setAgent({ agentBusy: true, agentAnswer: null, agentError: false, agentChecked: false });

    // Step 3. Read straight from Dexie at ask time, so the summary is never stale.
    const [people, links, reminders, thresholds] = await Promise.all([db.people.toArray(), db.links.toArray(), db.reminders.toArray(), readDriftThresholds()]);
    // M10 (M5-I5): the model's "lost touch" rule must use the user's limits. Sent only when they
    // differ from the defaults, so ordinary requests (and the demo cache) stay unchanged.
    const driftDays = isDefaultThresholds(thresholds) ? undefined : { ring1: thresholds[1], ring2: thresholds[2] };
    const result = await askQuery(q, buildSummary(people, links, reminders), controller.signal, driftDays);
    if (controller.signal.aborted) return; // cancelled or replaced: a late reply must not overwrite anything
    pending.current = null;

    // Step 4
    if (!result.ok) {
      setAgent({ agentBusy: false, agentAnswer: result.message, agentError: true });
      return;
    }

    // Oct 18: "text me Lena's items". The model writes the message; it goes to the owner's own
    // phone through Photon, and only when the user's words asked for a text (asksForText).
    if (result.data.textMe && asksForText(q)) {
      let note = 'Sent to your phone.';
      try {
        if ((await textOwner(result.data.textMe)) === 'no_token') note = 'Couldn’t text you: connect the texting agent in Settings first.';
      } catch {
        note = 'Couldn’t text you: the texting agent isn’t running on this server.';
      }
      if (controller.signal.aborted) return;
      setAgent({ agentBusy: false, agentAnswer: `${result.data.answer} ${note}` });
      setHighlights(result.data.personIds.filter((id) => people.some((p) => p.id === id)));
      return;
    }

    // Oct 18: a request to CHANGE the network ("connect Abbey and John") comes back as proposed
    // edits. Same guardrail as the server, then the review sheet: nothing is written until the
    // user accepts.
    const edits = cleanEdits(result.data.edits, new Set(people.map((p) => p.id)));
    if (edits.length) {
      const shown = await proposeEdits(edits);
      setAgent({ agentBusy: false, agentAnswer: shown ? result.data.answer : 'Nothing to change: your map already looks like that.' });
      setHighlights([...new Set(edits.flatMap((e) => e.personIds))]);
      return;
    }

    // Step 5. The model writes the sentence; CODE decides who is highlighted (M5 review: live
    // answers missed people AND added wrong ones):
    //   - "lost touch" → the exact drift rule, not the model's list;
    //   - otherwise model ids that exist locally and are grounded in the named company/school,
    //     plus every exact company/school match.
    // (M16: the rule lives in answerIds, shared with the texting agent.)
    const local = new Set(people.map((p) => p.id));
    const modelIds = new Set(result.data.personIds.filter((id) => local.has(id)));
    const ids = answerIds(q, people, result.data.personIds, result.data.filterHint, (p) => driftLevel(p, new Date(), thresholds) > 0);
    // M5-O2: if code changed the model's list, the card says so (its sentence may miscount).
    const checked = ids.length !== modelIds.size || ids.some((id) => !modelIds.has(id));
    setAgent({ agentBusy: false, agentAnswer: result.data.answer, agentChecked: checked });
    setHighlights(ids);
    // M7: driftingIds is real now (App computes it with driftLevel), so both hints switch the view.
    if (result.data.filterHint !== 'none') setFilter(result.data.filterHint);
    if (ids.length === 1) selectPerson(ids[0]!);
  };

  // Step 1
  return (
    <form role="search" onSubmit={ask} className="relative w-full">
      <Sparkles className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
      <Input
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        onKeyDown={(e) => {
          // Step 6
          if (e.key === 'Escape') {
            setQuestion('');
            clearFocus();
            if (busy) setAgent({ agentBusy: false }); // cancels via the subscription above
          }
        }}
        maxLength={500}
        aria-label="Ask Connectwork about your network"
        placeholder="Ask Connectwork… e.g. Who do I know at Microsoft?"
        className="pr-8 pl-8"
        aria-busy={busy}
      />
      {busy && <Loader2 className="absolute top-1/2 right-2.5 size-4 -translate-y-1/2 animate-spin text-muted-foreground" aria-hidden="true" />}
    </form>
  );
}
