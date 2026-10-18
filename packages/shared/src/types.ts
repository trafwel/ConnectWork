/**
 * M0 — Domain types · done
 *
 * WHAT THIS ACHIEVES
 *   One definition of what a person, link, reminder, tag, meeting and contact log
 *   are, used by the browser database, the UI, the AI summary and the server.
 *   Change a field here and TypeScript shows every place that must follow.
 *
 * HOW IT FITS
 *   Imported as `@connectwork/shared` by both apps (source is consumed directly,
 *   no build step). Exact field list mirrors SPEC.md §5.
 *
 * HOW IT WAS BUILT
 *   1. Ring is 1 | 2 | 3 (1 = closest).
 *   2. Person keeps dates as ISO strings (YYYY-MM-DD) so they sort and compare as text.
 *   3. Link is undirected: always stored with fromId < toId (see db/actions.ts normalizeLink).
 *   4. lastContact drives drift; logging contact always writes a ContactLog too.
 *
 * Guide: §4.2
 */
export type Ring = 1 | 2 | 3;

export type TagBehavior = 'none' | 'follow-up' | 'intro';

export interface Tag {
  name: string;
  color: string;
  behavior: TagBehavior;
}

export interface Person {
  id: string;
  name: string;
  ring: Ring;
  primaryTag: string;
  tags: string[];
  company?: string;
  role?: string;
  school?: string;
  email?: string;
  linkedinUrl?: string;
  /** ISO date */
  metAt?: string;
  /** ISO date; drives drift */
  lastContact?: string;
  notes?: string;
  source: 'manual' | 'linkedin' | 'snap' | 'seed';
  /** ISO datetime */
  createdAt: string;
  /**
   * Oct 18: where the user dropped this person in "Move people", so the layout leaves them
   * there. Polar and relative (angle in radians from the center, distance as a fraction of the
   * map's smaller side), so it survives resizing. Absent = placed automatically.
   */
  pin?: { angle: number; dist: number };
}

/** Undirected: stored with fromId < toId. */
export interface Link {
  id: string;
  fromId: string;
  toId: string;
  label?: string;
  source: 'user' | 'ai';
  status: 'suggested' | 'accepted';
}

export interface Reminder {
  id: string;
  personId: string;
  /** ISO date */
  dueDate: string;
  note: string;
  done: boolean;
  calendarEventId?: string;
}

export interface Meeting {
  id: string;
  title: string;
  start: string;
  end: string;
  attendeeEmails: string[];
  attendeePersonIds: string[];
}

export interface ContactLog {
  id: string;
  personId: string;
  date: string;
  kind: 'meeting' | 'message' | 'other';
  note?: string;
}
