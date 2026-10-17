import { useState } from 'react';
import { Loader2, Sparkles } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { db } from '@/db/db';
import { askQuery } from '@/lib/api';
import { buildSummary } from '@/lib/graphSummary';
import { useStore } from '@/store/useStore';

/** Plain-English questions about the network; the answer highlights people on the map. */
export function AgentBar() {
  const [question, setQuestion] = useState('');
  const busy = useStore((s) => s.agentBusy);
  const setAgent = useStore((s) => s.setAgent);
  const setHighlights = useStore((s) => s.setHighlights);
  const setFilter = useStore((s) => s.setFilter);
  const selectPerson = useStore((s) => s.selectPerson);
  const clearFocus = useStore((s) => s.clearFocus);

  const ask = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = question.trim();
    if (!q || busy) return;
    clearFocus();
    setAgent({ agentBusy: true, agentAnswer: null, agentError: false });

    const [people, links, reminders] = await Promise.all([db.people.toArray(), db.links.toArray(), db.reminders.toArray()]);
    const result = await askQuery(q, buildSummary(people, links, reminders));

    if (!result.ok) {
      setAgent({ agentBusy: false, agentAnswer: result.message, agentError: true });
      return;
    }
    // The server already drops unknown ids; check again against what is in this browser now.
    const known = new Set(people.map((p) => p.id));
    const ids = result.data.personIds.filter((id) => known.has(id));
    setAgent({ agentBusy: false, agentAnswer: result.data.answer, agentError: false });
    setHighlights(ids);
    if (result.data.filterHint !== 'none') setFilter(result.data.filterHint);
    if (ids.length === 1) selectPerson(ids[0]!);
  };

  return (
    <form onSubmit={ask} className="relative w-full max-w-xl" role="search">
      <Sparkles className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
      <Input
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            setQuestion('');
            clearFocus();
          }
        }}
        placeholder="Ask Connectwork… e.g. Who do I know at Microsoft?"
        aria-label="Ask Connectwork about your network"
        className="pl-8"
        disabled={busy}
      />
      {busy && <Loader2 className="absolute top-1/2 right-2.5 size-4 -translate-y-1/2 animate-spin text-muted-foreground" aria-hidden="true" />}
    </form>
  );
}
