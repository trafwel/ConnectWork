/**
 * M1 — Browser database (IndexedDB via Dexie) · done
 *
 * WHAT THIS ACHIEVES
 *   All user data lives here, in the user's own browser: no accounts, no server
 *   database. This is the foundation of our privacy promise (local-first).
 *
 * HOW IT FITS
 *   Components read with useLiveQuery (auto-refresh on change); all writes go
 *   through db/actions.ts; seed.ts fills and resets it; TABLES drives export/clear.
 *
 * HOW IT WAS BUILT
 *   1. One Dexie class with typed tables: people, links, reminders, tags, meetings,
 *      contactLogs, meta (key/value for flags like 'seeded' and settings).
 *   2. Indexes only on fields we query by (ring, primaryTag, email, personId, dueDate…).
 *   3. Schema version 1 — bump the version and add an upgrade if fields change shape.
 *
 * Spec: SPEC.md §6 · Guide: §5.2
 */
import Dexie, { type Table } from 'dexie';
import type { ContactLog, Link, Meeting, Person, Reminder, Tag } from '@connectwork/shared';

export class ConnectworkDB extends Dexie {
  people!: Table<Person, string>;
  links!: Table<Link, string>;
  reminders!: Table<Reminder, string>;
  tags!: Table<Tag, string>;
  meetings!: Table<Meeting, string>;
  contactLogs!: Table<ContactLog, string>;
  meta!: Table<{ key: string; value: unknown }, string>;

  constructor() {
    super('connectwork');
    this.version(1).stores({
      people: 'id, name, ring, primaryTag, company, email, linkedinUrl, lastContact',
      links: 'id, fromId, toId, status',
      reminders: 'id, personId, dueDate, done',
      tags: 'name',
      meetings: 'id, start',
      contactLogs: 'id, personId, date',
      meta: 'key',
    });
  }
}

export const db = new ConnectworkDB();

export const TABLES = ['people', 'links', 'reminders', 'tags', 'meetings', 'contactLogs', 'meta'] as const;
