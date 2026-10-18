/**
 * M16 — Browser side of the texting agent · done
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
import { RelayRequest, type RelayReply } from '@connectwork/shared';
import { addPerson, addReminder, logContact, markDueTexted } from '@/db/actions';
import { db } from '@/db/db';
import { useStore } from '@/store/useStore';
import { askQuery } from './api';
import { addDays, formatDate, isoDate, today } from './dates';
import { driftLevel, isDefaultThresholds } from './drift';
import { answerIds } from './exactMatch';
import { buildSummary } from './graphSummary';
import { clip, digestText, dueText, HELP_TEXT, resolvePerson, whichOne } from './textAgent';
import { readDriftThresholds } from './useDriftThresholds';
import { weeklyCandidates } from './weeklyCandidates';

export type RelayStatus = 'off' | 'connecting' | 'connected' | 'error';

const BASE: string = import.meta.env.VITE_API_BASE ?? '/api';

/** Step 1. Returns a disconnect function. EventSource reconnects on its own after a drop. */
export function connectRelay(token: string, onStatus: (status: RelayStatus) => void): () => void {
  let es: EventSource | null = null;
  let retry: ReturnType<typeof setTimeout> | undefined;
  let delay = 2000;
  let stopped = false;
  let heardAt = Date.now();
  const open = () => {
    es?.close();
    es = new EventSource(`${BASE}/relay/stream?token=${encodeURIComponent(token)}`);
    heardAt = Date.now();
    onStatus('connecting');
    es.addEventListener('ready', () => {
      delay = 2000;
      heardAt = Date.now();
      onStatus('connected');
    });
    // The server pings every 25 s. Oct 18: when the server restarted behind the dev proxy, the
    // proxy kept the browser's side of the stream open, so no error ever fired and texts went
    // unanswered. Silence for a minute now counts as a dead stream.
    es.addEventListener('ping', () => {
      heardAt = Date.now();
    });
    es.addEventListener('request', (e) => {
      const parsed = RelayRequest.safeParse(JSON.parse((e as MessageEvent<string>).data || 'null'));
      if (!parsed.success) return; // ignore anything that isn't a valid request
      void (async () => {
        const reply = await answer(parsed.data).catch((): RelayReply => ({ id: parsed.data.id, text: 'Sorry, something went wrong on my side. Try again in a moment.', personIds: [] }));
        // Step 4.
        await fetch(`${BASE}/relay/reply`, {
          method: 'POST',
          headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
          body: JSON.stringify(reply),
        }).catch(() => undefined);
      })();
    });
    // A network drop retries by itself ("connecting"). A response that isn't an event stream
    // closes the EventSource for good: a wrong token (401), but also the dev proxy's error page
    // while the server restarts. Oct 18: that left texting silently dead until a reload, so a
    // closed stream now reopens with a growing delay (2 s up to a minute) until stopped.
    es.onerror = () => {
      if (es?.readyState !== EventSource.CLOSED) {
        onStatus('connecting');
        return;
      }
      onStatus('error');
      if (stopped) return;
      retry = setTimeout(open, delay);
      delay = Math.min(delay * 2, 60_000);
    };
  };
  open();
  const watchdog = setInterval(() => {
    if (!stopped && Date.now() - heardAt > 60_000) open();
  }, 15_000);
  return () => {
    stopped = true;
    clearTimeout(retry);
    clearInterval(watchdog);
    es?.close();
    onStatus('off');
  };
}

/** Step 3. The map shows who the text was about, and the answer card shows the exchange. */
function show(text: string, reply: string, ids: string[]) {
  const s = useStore.getState();
  s.setHighlights(ids);
  s.setAgent({ agentAnswer: `Texted: "${clip(text, 80)}" → ${reply}`, agentError: false, agentChecked: false });
}

/** Step 2. Answer one text from THIS browser's data, using the app's own flows. */
export async function answer(req: RelayRequest): Promise<RelayReply> {
  const { intent } = req;
  const [people, links, reminders, thresholds] = await Promise.all([db.people.toArray(), db.links.toArray(), db.reminders.toArray(), readDriftThresholds()]);
  const done = (text: string, personIds: string[] = []): RelayReply => {
    const out = clip(text);
    show(req.text, out, personIds);
    return { id: req.id, text: out, personIds };
  };
  const one = (name: string | undefined) => resolvePerson(name ?? '', people);

  switch (intent.intent) {
    case 'query': {
      const q = intent.question?.trim() || req.text;
      const driftDays = isDefaultThresholds(thresholds) ? undefined : { ring1: thresholds[1], ring2: thresholds[2] };
      const res = await askQuery(q, buildSummary(people, links, reminders), undefined, driftDays);
      if (!res.ok) return done(res.message);
      const ids = answerIds(q, people, res.data.personIds, res.data.filterHint, (p) => driftLevel(p, new Date(), thresholds) > 0);
      return done(res.data.answer, ids);
    }
    case 'add_person': {
      const d = intent.person!;
      // Loaded on demand: the matcher lives with the CSV code (and Papa Parse).
      const { findMatch } = await import('./csv');
      const existing = findMatch(people, { name: d.name, company: d.company, role: d.role, school: d.school });
      if (existing) return done(`${existing.name} is already in your network${existing.company ? ` (${existing.company})` : ''}.`, [existing.id]);
      const person = await addPerson({
        name: d.name,
        ring: 3,
        primaryTag: d.company ? 'Work' : d.school ? 'School' : 'Friends',
        company: d.company,
        role: d.role,
        school: d.school,
        notes: d.note,
        lastContact: today(),
      });
      return done(`Added ${person.name}${d.company ? ` (${d.company})` : ''} to your map, ring 3. Move them closer anytime.`, [person.id]);
    }
    case 'remind': {
      const r = one(intent.target?.personName);
      if (r.kind === 'none') return done(`I couldn't find ${intent.target?.personName ?? 'that person'} in your network.`);
      if (r.kind === 'many') return done(whichOne(r.people), r.people.map((p) => p.id));
      const due = intent.target?.dueDate ?? isoDate(addDays(new Date(), 7));
      await addReminder(r.person.id, due, intent.target?.note?.trim() || 'Follow up');
      return done(`Reminder set: follow up with ${r.person.name} on ${formatDate(due)}.`, [r.person.id]);
    }
    case 'log_contact': {
      const r = one(intent.target?.personName);
      if (r.kind === 'none') return done(`I couldn't find ${intent.target?.personName ?? 'that person'} in your network.`);
      if (r.kind === 'many') return done(whichOne(r.people), r.people.map((p) => p.id));
      await logContact(r.person.id, 'message');
      return done(`Logged: you talked to ${r.person.name} today, so they won't drift.`, [r.person.id]);
    }
    case 'digest': {
      const c = weeklyCandidates(people, links, reminders, new Date(), thresholds);
      const ids = c.flatMap((x) => ('personId' in x ? [x.personId] : x.kind === 'intro' ? x.personIds : [x.fromId, x.toId]));
      return done(digestText(c, people), [...new Set(ids)]);
    }
    case 'help':
      return done(HELP_TEXT);
    default:
      return done(`I can answer questions about your network, add people, set reminders and log contact. ${HELP_TEXT}`);
  }
}

/** Step 5. Text the owner (e.g. "Text me this" on the weekly review). */
export async function notifyOwner(token: string, text: string): Promise<void> {
  const res = await fetch(`${BASE}/relay/notify`, {
    method: 'POST',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) throw new Error('The texting agent is not running');
}

/**
 * Oct 18 (team request: "Photon should message you if something is due"). Texts the owner what's
 * due today or overdue, at most once a day per device: when the tab connects, and hourly after
 * that so a new day is noticed. `force` (Settings → "Text me what's due") skips the daily guard.
 */
export async function textDue(force = false): Promise<'sent' | 'nothing_due' | 'already_sent' | 'no_token'> {
  const token = (await db.meta.get('relayToken'))?.value;
  if (typeof token !== 'string' || !token) return 'no_token';
  const day = today();
  if (!force && (await db.meta.get('dueTextedOn'))?.value === day) return 'already_sent';
  const [people, reminders] = await Promise.all([db.people.toArray(), db.reminders.toArray()]);
  const text = dueText(reminders, people);
  if (!text) return 'nothing_due';
  await notifyOwner(token, text);
  await markDueTexted(day);
  return 'sent';
}

/** Oct 18: the search bar's "text me …". Sends to the owner's own number through Photon. */
export async function textOwner(text: string): Promise<'sent' | 'no_token'> {
  const token = (await db.meta.get('relayToken'))?.value;
  if (typeof token !== 'string' || !token) return 'no_token';
  await notifyOwner(token, text);
  return 'sent';
}

// Step 5 (App + Settings). One connection per tab: starting again replaces the old one.
let stop: (() => void) | null = null;
let dueTimer: ReturnType<typeof setInterval> | undefined;

export function startRelay(token: string): void {
  stopRelay();
  stop = connectRelay(token, (status) => {
    useStore.getState().setRelayStatus(status);
    if (status === 'connected') void textDue().catch(() => undefined);
  });
  dueTimer = setInterval(() => {
    if (useStore.getState().relayStatus === 'connected') void textDue().catch(() => undefined);
  }, 60 * 60 * 1000);
}

export function stopRelay(): void {
  stop?.();
  stop = null;
  clearInterval(dueTimer);
}

/** App start: reconnect with the token saved on this device, if any. */
export async function resumeRelay(): Promise<void> {
  const token = (await db.meta.get('relayToken'))?.value;
  if (typeof token === 'string' && token) startRelay(token);
}

