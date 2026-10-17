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
