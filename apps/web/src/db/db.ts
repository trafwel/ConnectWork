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
