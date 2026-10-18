/**
 * Stored-row schemas · added in the post-M4 open-issues step (M1-S2)
 *
 * WHAT THIS ACHIEVES
 *   Describes exactly what a valid row in each IndexedDB table looks like, so a backup
 *   file is checked field by field before it replaces anyone's data. A tampered or
 *   corrupted file can't put ring 99, a missing name, or a 1 MB note into the app.
 *
 * HOW IT FITS
 *   apps/web/src/db/seed.ts importBackup() validates every row with these. Each schema
 *   `satisfies` the matching TypeScript type, so the two can't drift apart.
 *
 * RULES
 *   - Reject what is broken (wrong types, missing required fields, out-of-range values).
 *   - Clean what is merely unsafe: a link that isn't http(s) is dropped from that row
 *     instead of rejecting the whole backup over one bad URL.
 *   - Unknown fields are stripped (zod's default), so nothing extra reaches the database.
 *   - Same length limits as the person card and the CSV import.
 */
import { z } from 'zod';
import type { ContactLog, Link, Meeting, Person, Reminder, Tag } from './types';

const id = z.string().min(1).max(64);
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const text = (max: number) => z.string().max(max);
const optionalText = (max: number) => text(max).optional();

/** Keeps http(s) and scheme-less URLs ("linkedin.com/in/x"); drops javascript:, data:, … */
const safeUrl = text(300)
  .optional()
  .transform((v) => (v && /^(https?:\/\/|[^:/?#]+(\/|$))/i.test(v.trim()) ? v : undefined));

/**
 * Oct 18: the only photos we draw: our bundled demo portraits, or a small image stored inline.
 * An http(s) address would make the browser fetch from a third party (a tracking pixel in a
 * backup file), so it's dropped, like unsafe links.
 */
export const PHOTO_MAX = 300_000;
export function isSafePhoto(v: unknown): v is string {
  return (
    typeof v === 'string' &&
    v.length <= PHOTO_MAX &&
    (/^\/avatars\/[\w-]{1,64}\.(jpe?g|png|webp)$/.test(v) || /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+=*$/.test(v))
  );
}

export const PersonRow = z.object({
  id,
  name: z.string().trim().min(1).max(120),
  ring: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  primaryTag: z.string().min(1).max(40),
  tags: z.array(z.string().min(1).max(40)).max(50),
  company: optionalText(300),
  role: optionalText(300),
  school: optionalText(300),
  email: optionalText(300),
  linkedinUrl: safeUrl,
  metAt: isoDate.optional(),
  lastContact: isoDate.optional(),
  notes: optionalText(5000),
  source: z.enum(['manual', 'linkedin', 'snap', 'seed']),
  createdAt: text(40),
  pin: z.object({ angle: z.number().min(-7).max(7), dist: z.number().min(0).max(1) }).optional(),
  photo: z
    .string()
    .optional()
    .transform((v) => (isSafePhoto(v) ? v : undefined)),
}) satisfies z.ZodType<Person, unknown>;

export const LinkRow = z.object({
  id,
  fromId: id,
  toId: id,
  label: optionalText(200),
  source: z.enum(['user', 'ai']),
  status: z.enum(['suggested', 'accepted']),
}) satisfies z.ZodType<Link, unknown>;

export const ReminderRow = z.object({
  id,
  personId: id,
  dueDate: isoDate,
  note: text(200),
  done: z.boolean(),
  calendarEventId: optionalText(200),
}) satisfies z.ZodType<Reminder, unknown>;

export const TagRow = z.object({
  name: z.string().min(1).max(40),
  color: z.string().regex(/^#[0-9a-f]{3,8}$/i), // same rule as safeColor() in the web app
  behavior: z.enum(['none', 'follow-up', 'intro']),
}) satisfies z.ZodType<Tag, unknown>;

export const MeetingRow = z.object({
  id,
  title: text(300),
  start: text(40),
  end: text(40),
  attendeeEmails: z.array(text(300)).max(200),
  attendeePersonIds: z.array(id).max(200),
}) satisfies z.ZodType<Meeting, unknown>;

export const ContactLogRow = z.object({
  id,
  personId: id,
  date: isoDate,
  kind: z.enum(['meeting', 'message', 'other']),
  note: optionalText(1000),
}) satisfies z.ZodType<ContactLog, unknown>;

/** Settings that may travel in a backup. Secrets (e.g. relayToken) never do. */
export const BACKUP_META_KEYS = ['seeded', 'userContext', 'driftThresholds'] as const;
export const MetaRow = z.object({
  key: z.enum(BACKUP_META_KEYS),
  value: z.union([z.boolean(), text(2000), z.record(z.string(), z.number())]),
});

export const STORED_ROW_SCHEMAS = {
  people: PersonRow,
  links: LinkRow,
  reminders: ReminderRow,
  tags: TagRow,
  meetings: MeetingRow,
  contactLogs: ContactLogRow,
  meta: MetaRow,
} as const;
