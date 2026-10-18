/**
 * M16 — the texting agent's pure helpers (tested in textAgent.test.ts)
 *
 * Texts are short and ambiguous ("had coffee with Abbey"), so before the open tab changes
 * anything it must know WHICH person is meant, and it must answer in a few lines. These
 * functions decide that from the local data; lib/relayClient.ts does the I/O.
 */
import type { Candidate, Person, Reminder } from '@connectwork/shared';
import { daysSince } from './dates';

/** iMessage reads well up to a few lines; the server also signs every reply. */
export const MAX_REPLY = 320;
export const clip = (text: string, max = MAX_REPLY) => (text.length <= max ? text : `${text.slice(0, max - 1).trimEnd()}…`);

export type Resolved = { kind: 'one'; person: Person } | { kind: 'many'; people: Person[] } | { kind: 'none' };

const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ');

/**
 * "Abbey" / "abbey chen" / "John P" → one person, several (ask which), or none.
 * Exact full name first, then a unique match on first name, then names starting with the text.
 */
export function resolvePerson(name: string, people: Person[]): Resolved {
  const q = norm(name);
  if (!q) return { kind: 'none' };
  const exact = people.filter((p) => norm(p.name) === q);
  if (exact.length === 1) return { kind: 'one', person: exact[0]! };
  if (exact.length > 1) return { kind: 'many', people: exact };
  const first = people.filter((p) => norm(p.name).split(' ')[0] === q);
  if (first.length === 1) return { kind: 'one', person: first[0]! };
  if (first.length > 1) return { kind: 'many', people: first };
  const prefix = people.filter((p) => norm(p.name).startsWith(q));
  if (prefix.length === 1) return { kind: 'one', person: prefix[0]! };
  return prefix.length ? { kind: 'many', people: prefix } : { kind: 'none' };
}

/** "Which one: Sam Lee (Acme), Sam Lee (Globex) or Sam Li?" */
export function whichOne(people: Person[]): string {
  const names = people.slice(0, 3).map((p) => (p.company ? `${p.name} (${p.company})` : p.name));
  const list = names.length > 1 ? `${names.slice(0, -1).join(', ')} or ${names.at(-1)}` : names[0];
  return `Which one: ${list}?`;
}

/** The weekly review as one text: counts first, then names (never notes). */
export function digestText(candidates: Candidate[], people: Person[]): string {
  const name = new Map(people.map((p) => [p.id, p.name]));
  const follow = candidates.filter((c) => c.kind === 'follow_up').map((c) => (c.kind === 'follow_up' ? name.get(c.personId) : undefined));
  const drift = candidates.filter((c) => c.kind === 'reconnect').map((c) => (c.kind === 'reconnect' ? name.get(c.personId) : undefined));
  const links = candidates.filter((c) => c.kind === 'accept_link').length;
  const intros = candidates.filter((c) => c.kind === 'intro').length;
  if (!follow.length && !drift.length && !links && !intros) return "You're all caught up this week.";
  const parts = [
    follow.length && `${follow.length} follow-up${follow.length === 1 ? '' : 's'} due (${follow.filter(Boolean).slice(0, 4).join(', ')})`,
    drift.length && `${drift.length} ${drift.length === 1 ? 'person' : 'people'} to reconnect with (${drift.filter(Boolean).slice(0, 4).join(', ')})`,
    links && `${links} suggested link${links === 1 ? '' : 's'} to review`,
    intros && `${intros} possible intro${intros === 1 ? '' : 's'}`,
  ].filter(Boolean);
  return clip(`This week: ${parts.join('; ')}. Open Connectwork to approve.`);
}

/**
 * Oct 18: the text Photon sends on its own when something is due (today or overdue). Names and
 * how late only, never the reminder notes, like the digest. null when nothing is due.
 */
export function dueText(reminders: Reminder[], people: Person[], now = new Date()): string | null {
  const name = new Map(people.map((p) => [p.id, p.name]));
  const open = reminders
    .filter((r) => !r.done && name.has(r.personId) && daysSince(r.dueDate, now) >= 0)
    .sort((a, b) => b.dueDate.localeCompare(a.dueDate) || a.personId.localeCompare(b.personId));
  if (!open.length) return null;
  const today = [...new Set(open.filter((r) => daysSince(r.dueDate, now) === 0).map((r) => name.get(r.personId)))];
  const late = open
    .filter((r) => daysSince(r.dueDate, now) > 0)
    .map((r) => {
      const d = daysSince(r.dueDate, now);
      return `${name.get(r.personId)} (${d} day${d === 1 ? '' : 's'} late)`;
    });
  const parts = [
    today.length && `Due today: ${today.join(', ')}`,
    late.length && `Overdue: ${late.slice(0, 5).join(', ')}${late.length > 5 ? ` and ${late.length - 5} more` : ''}`,
  ].filter(Boolean);
  return clip(`${parts.join('. ')}. Open Connectwork to follow up.`);
}

export const HELP_TEXT =
  'Text me things like: "who do I know at Microsoft?", "met Sarah Kim from Stripe at DubHacks", "remind me to email John Friday", "had coffee with Abbey", or "what\'s due?". Your open Connectwork tab answers from your own data.';
