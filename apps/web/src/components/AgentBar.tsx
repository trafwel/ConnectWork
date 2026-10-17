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
 *      if filterHint === 'due' → setFilter('due') ('drifting' waits for M10: its set is empty
 *      until then and would dim everyone); if exactly one id → selectPerson(id).
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
import { askQuery } from '@/lib/api';
import { driftLevel } from '@/lib/drift';
import { exactMatches, groundModelIds } from '@/lib/exactMatch';
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
    const [people, links, reminders] = await Promise.all([db.people.toArray(), db.links.toArray(), db.reminders.toArray()]);
    const result = await askQuery(q, buildSummary(people, links, reminders), controller.signal);
    if (controller.signal.aborted) return; // cancelled or replaced: a late reply must not overwrite anything
    pending.current = null;

    // Step 4
    if (!result.ok) {
      setAgent({ agentBusy: false, agentAnswer: result.message, agentError: true });
      return;
    }

    // Step 5. The model writes the sentence; CODE decides who is highlighted (M5 review: live
    // answers missed people AND added wrong ones):
    //   - "lost touch" → the exact drift rule, not the model's list;
    //   - otherwise model ids that exist locally and are grounded in the named company/school,
    //     plus every exact company/school match.
    const local = new Set(people.map((p) => p.id));
    const modelIds = new Set(result.data.personIds.filter((id) => local.has(id)));
    const ids =
      result.data.filterHint === 'drifting'
        ? people.filter((p) => driftLevel(p) > 0).map((p) => p.id)
        : [...new Set([...groundModelIds(q, people, result.data.personIds.filter((id) => local.has(id))), ...exactMatches(q, people)])];
    // M5-O2: if code changed the model's list, the card says so (its sentence may miscount).
    const checked = ids.length !== modelIds.size || ids.some((id) => !modelIds.has(id));
    setAgent({ agentBusy: false, agentAnswer: result.data.answer, agentChecked: checked });
    setHighlights(ids);
    if (result.data.filterHint === 'due') setFilter('due');
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
