/**
 * M1 — Browser database (IndexedDB via Dexie) · done
 *
 * WHAT THIS ACHIEVES
 *   All user data lives here, in the user's own browser: no accounts, no server
 *   database. This is the foundation of our privacy promise (local-first).
 *
 * HOW IT FITS
 *   Components READ with useLiveQuery (dexie-react-hooks), which re-renders when a
 *   table changes. All WRITES go through db/actions.ts (M3). seed.ts fills/resets it;
 *   TABLES drives export and clear-all.
 *
 * STEPS
 *   1. `pnpm --filter @connectwork/web add dexie dexie-react-hooks nanoid zustand`
 *   2. In the constructor, after super('connectwork'), declare schema version 1. Only
 *      list fields you QUERY by (the primary key first); other fields are stored anyway:
 *        this.version(1).stores({
 *          people: 'id, name, ring, primaryTag, company, email, linkedinUrl, lastContact',
 *          links: 'id, fromId, toId, status',
 *          reminders: 'id, personId, dueDate, done',
 *          tags: 'name',
 *          meetings: 'id, start',
 *          contactLogs: 'id, personId, date',
 *          meta: 'key',          // key/value: 'seeded', 'userContext', 'driftThresholds', …
 *        });
 *   3. If a field's shape ever changes, add version(2) with an upgrade() instead of editing version 1.
 *
 * DONE WHEN
 *   - In DevTools → Application → IndexedDB you see a "connectwork" database with 7 tables.
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
    // Primary key first, then only the fields we query by. Other fields are stored but not indexed.
    // Changing the schema later = add version(2) with an upgrade(), never edit version 1.
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

/** Every table, so export/clear code can loop over all of them. */
export const TABLES = ['people', 'links', 'reminders', 'tags', 'meetings', 'contactLogs', 'meta'] as const;
