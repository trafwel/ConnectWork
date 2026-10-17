import type { Link, Person, Reminder } from '@connectwork/shared';

/** Pipes and newlines would break the line format, so they are flattened. */
const field = (v: string | number | undefined) => String(v ?? '').replace(/[|\n\r]+/g, ' / ').trim();

/**
 * Compact text view of the network for the model (format described in the
 * server's prompts.ts). Notes are deliberately left out.
 */
export function buildSummary(people: Person[], links: Link[], reminders: Reminder[]): string {
  const ids = new Set(people.map((p) => p.id));
  const lines = people.map((p) =>
    [
      'P',
      p.id,
      field(p.name),
      p.ring,
      field(p.primaryTag),
      field(p.tags.join(',')),
      field(p.company),
      field(p.role),
      field(p.school),
      p.lastContact ?? '',
      p.metAt ?? '',
    ].join('|'),
  );
  for (const l of links) {
    if (l.status === 'accepted' && ids.has(l.fromId) && ids.has(l.toId)) lines.push(['L', l.fromId, l.toId, field(l.label)].join('|'));
  }
  for (const r of reminders) {
    if (!r.done && ids.has(r.personId)) lines.push(['R', r.personId, r.dueDate, field(r.note)].join('|'));
  }
  return lines.join('\n');
}
