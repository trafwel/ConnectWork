/**
 * M1 — Demo data generator (`pnpm seed`) · done
 *
 * WHAT THIS ACHIEVES
 *   A realistic, entirely fictional network that makes every feature demoable from
 *   the first second: 40 people across three rings, links inside groups, overdue
 *   reminders, drifting friends, a fake LinkedIn export, a club roster PDF and sample
 *   meetings. It plants the demo story: Abbey Chen and John Park share a school and
 *   Microsoft but are NOT linked, so the AI can discover them in M6.
 *
 * HOW IT FITS
 *   Writes demo/seed.json (loaded on first run by apps/web/src/db/seed.ts),
 *   demo/Connections.csv (M4), demo/calendar-events.json (M11), demo/roster.pdf (M9).
 *
 * KEY IDEAS
 *   - Seeded RNG (mulberry32): same seed → same "random" sequence → identical files on
 *     every run, so the demo is predictable and git diffs stay clean.
 *   - Dates are stored as OFFSETS (metDaysAgo, lastContactDaysAgo, dueInDays,
 *     dayOffset) and turned into real dates when the app loads (db/materialize.ts),
 *     so "due tomorrow" is true on whatever day we demo.
 *   - Fictional only: generated names, @example.com emails, LinkedIn URLs ending -demo.
 *
 * DONE WHEN
 *   - `pnpm seed` prints the counts and regenerates byte-identical files.
 *
 * Guide: docs/IMPLEMENTATION_GUIDE.md §5.1
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

const OUT = fileURLToPath(new URL('../demo/', import.meta.url));
mkdirSync(OUT, { recursive: true });

// --- deterministic RNG (mulberry32) ---
let state = 20261017;
function rand(): number {
  state |= 0;
  state = (state + 0x6d2b79f5) | 0;
  let t = Math.imul(state ^ (state >>> 15), 1 | state);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const pick = <T>(xs: readonly T[]): T => xs[Math.floor(rand() * xs.length)]!;
const int = (lo: number, hi: number) => lo + Math.floor(rand() * (hi - lo + 1));

const FIRST = ['Maya', 'Ethan', 'Priya', 'Lucas', 'Sofia', 'Noah', 'Aisha', 'Daniel', 'Hana', 'Owen', 'Lena', 'Marcus', 'Zoe', 'Ravi', 'Chloe', 'Felix', 'Nina', 'Theo', 'Isla', 'Kenji', 'Amara', 'Leo', 'Grace', 'Omar', 'Ivy', 'Samuel', 'Mei', 'Jonah', 'Tara', 'Victor', 'Elena', 'Kai', 'Ruby', 'Diego', 'Nora', 'Arjun', 'Lily', 'Mateo', 'Yuna', 'Caleb'];
const LAST = ['Alvarez', 'Bennett', 'Choi', 'Dubois', 'Esposito', 'Fischer', 'Gupta', 'Hughes', 'Ito', 'Jensen', 'Kowalski', 'Larsen', 'Morales', 'Nguyen', 'Okafor', 'Petrov', 'Quinn', 'Rossi', 'Sato', 'Tanaka', 'Usman', 'Varga', 'Walsh', 'Xu', 'Yamada', 'Zhou', 'Lindqvist', 'Moreau', 'Haddad', 'Novak'];
const COMPANIES = ['Microsoft', 'Amazon', 'Google', 'Expedia Group', 'T-Mobile', 'Salesforce', 'Tableau', 'Zillow', 'Brightloop Labs', 'Northfin', 'Cascade Robotics', 'Evergreen Health'];
const ROLES = ['Software Engineer', 'Product Manager', 'Data Scientist', 'UX Designer', 'Engineering Manager', 'Recruiter', 'Software Engineer Intern', 'Research Scientist', 'Solutions Architect', 'Program Manager'];
const SCHOOLS = ['University of Washington', 'Seattle University', 'University of British Columbia'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const slug = (name: string) => name.toLowerCase().replace(/[^a-z]+/g, '-');
const linkedinUrl = (name: string) => `https://www.linkedin.com/in/${slug(name)}-demo`;

// ---------------------------------------------------------------------------
// seed.json — the hand-shaped first-run network
// ---------------------------------------------------------------------------
type SeedPerson = {
  id: string;
  name: string;
  ring: 1 | 2 | 3;
  primaryTag: string;
  tags: string[];
  company?: string;
  role?: string;
  school?: string;
  email?: string;
  linkedinUrl?: string;
  metDaysAgo?: number;
  lastContactDaysAgo?: number;
  notes?: string;
};

const people: SeedPerson[] = [];
const usedNames = new Set<string>();
const uniqueName = () => {
  for (;;) {
    const n = `${pick(FIRST)} ${pick(LAST)}`;
    if (!usedNames.has(n)) {
      usedNames.add(n);
      return n;
    }
  }
};

// The demo story pair: same school, Microsoft overlap, not linked.
usedNames.add('Abbey Chen');
usedNames.add('John Park');
people.push({
  id: 'p_abbey',
  name: 'Abbey Chen',
  ring: 2,
  primaryTag: 'Work',
  tags: ['Work'],
  company: 'Microsoft',
  role: 'Product Manager',
  school: 'University of Washington',
  email: 'abbey.chen@example.com',
  linkedinUrl: linkedinUrl('Abbey Chen'),
  metDaysAgo: 490,
  lastContactDaysAgo: 40,
  notes: 'Met on the Azure onboarding project. UW class of 2024. Offered to review my resume.',
});
people.push({
  id: 'p_john',
  name: 'John Park',
  ring: 2,
  primaryTag: 'School',
  tags: ['School', 'follow-up'],
  company: 'University of Washington',
  role: 'CS student, former Microsoft intern (summer 2025)',
  school: 'University of Washington',
  email: 'john.park@example.com',
  linkedinUrl: linkedinUrl('John Park'),
  metDaysAgo: 760,
  lastContactDaysAgo: 210,
  notes: 'Lab partner in CSE 332. Interned at Microsoft summer 2025. Said to ping him after the career fair.',
});

// Ring 1 (8 incl. none of the story pair), ring 2 (14 incl. story pair), ring 3 (18).
const plan: Array<{ ring: 1 | 2 | 3; tag: string; n: number }> = [
  { ring: 1, tag: 'Family', n: 3 },
  { ring: 1, tag: 'Friends', n: 4 },
  { ring: 1, tag: 'Work', n: 1 },
  { ring: 2, tag: 'Work', n: 4 },
  { ring: 2, tag: 'School', n: 4 },
  { ring: 2, tag: 'Clubs', n: 2 },
  { ring: 2, tag: 'Friends', n: 2 },
  { ring: 3, tag: 'Work', n: 6 },
  { ring: 3, tag: 'School', n: 5 },
  { ring: 3, tag: 'Clubs', n: 4 },
  { ring: 3, tag: 'Friends', n: 3 },
];

let counter = 0;
for (const { ring, tag, n } of plan) {
  for (let i = 0; i < n; i++) {
    const name = uniqueName();
    const work = tag === 'Work';
    const school = tag === 'School' || tag === 'Clubs' || rand() < 0.4 ? pick(SCHOOLS) : undefined;
    const lastContactDaysAgo =
      ring === 1 ? int(2, 45) : ring === 2 ? int(10, 150) : int(30, 400);
    people.push({
      id: `p_${String(++counter).padStart(2, '0')}`,
      name,
      ring,
      primaryTag: tag,
      tags: [tag],
      company: work ? pick(COMPANIES) : undefined,
      role: work ? pick(ROLES) : tag === 'School' ? 'Student' : undefined,
      school,
      email: rand() < 0.6 ? `${slug(name).replace(/-/g, '.')}@example.com` : undefined,
      linkedinUrl: work || rand() < 0.5 ? linkedinUrl(name) : undefined,
      metDaysAgo: lastContactDaysAgo + int(30, 900),
      lastContactDaysAgo,
    });
  }
}

// Four drifting ring-1/2 people (ring 1 > 90 days, ring 2 > 180 days).
const ring1 = people.filter((p) => p.ring === 1);
const ring2 = people.filter((p) => p.ring === 2 && !p.id.startsWith('p_abbey') && p.id !== 'p_john');
ring1[0]!.lastContactDaysAgo = 150;
ring1[1]!.lastContactDaysAgo = 120;
ring2[0]!.lastContactDaysAgo = 260;
ring2[1]!.lastContactDaysAgo = 300;

// Three people tagged intro.
for (const p of people.filter((p) => p.primaryTag === 'Work' && p.ring === 3).slice(0, 3)) {
  p.tags.push('intro');
}

// Accepted links inside clusters; never Abbey <-> John.
type SeedLink = { id: string; fromId: string; toId: string; label?: string };
const links: SeedLink[] = [];
const linkKey = new Set<string>();
const addLink = (a: string, b: string, label?: string) => {
  const [fromId, toId] = a < b ? [a, b] : [b, a];
  const key = `${fromId}|${toId}`;
  if (fromId === toId || linkKey.has(key) || key === 'p_abbey|p_john') return;
  linkKey.add(key);
  links.push({ id: `l_${String(links.length + 1).padStart(2, '0')}`, fromId, toId, label });
};
const byTag = (tag: string) => people.filter((p) => p.primaryTag === tag);
for (const tag of ['Family', 'Friends', 'Work', 'School', 'Clubs']) {
  const group = byTag(tag);
  for (let i = 0; i < group.length; i++) {
    const a = group[i]!;
    const b = group[(i + 1) % group.length]!;
    if (rand() < 0.75) addLink(a.id, b.id, tag === 'Work' ? 'worked together' : undefined);
  }
}
addLink('p_abbey', byTag('Work')[0]!.id, 'same team');
addLink('p_john', byTag('School')[0]!.id, 'CSE 332 study group');

// Reminders: John's due tomorrow, two overdue, one next week.
type SeedReminder = { id: string; personId: string; dueInDays: number; note: string };
const reminders: SeedReminder[] = [
  { id: 'r_john', personId: 'p_john', dueInDays: 1, note: 'Follow up after the career fair' },
  { id: 'r_01', personId: ring2[2]!.id, dueInDays: -3, note: 'Send the article we talked about' },
  { id: 'r_02', personId: ring1[2]!.id, dueInDays: -1, note: 'Birthday dinner plans' },
  { id: 'r_03', personId: byTag('Work')[1]!.id, dueInDays: 5, note: 'Ask about the referral' },
];

writeFileSync(`${OUT}seed.json`, JSON.stringify({ people, links, reminders }, null, 2) + '\n');

// ---------------------------------------------------------------------------
// Connections.csv — fake LinkedIn export (30 rows, 6 overlap the seed)
// ---------------------------------------------------------------------------
const DEMO_CSV_ROWS = 30;
const csvEscape = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
const linkedinDate = (daysAgo: number) => {
  const d = new Date(Date.UTC(2026, 9, 17) - daysAgo * 86400000);
  return `${String(d.getUTCDate()).padStart(2, '0')} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
};

const rows: string[][] = [];
// Overlaps with the seed, so re-import dedupe is exercised.
for (const p of people.filter((p) => p.linkedinUrl).slice(0, 6)) {
  const [first, ...rest] = p.name.split(' ');
  rows.push([first!, rest.join(' '), p.linkedinUrl!, '', p.company ?? '', p.role ?? '', linkedinDate(p.metDaysAgo ?? 400)]);
}
while (rows.length < 120) {
  const name = uniqueName();
  const [first, ...rest] = name.split(' ');
  rows.push([
    first!,
    rest.join(' '),
    linkedinUrl(name),
    rand() < 0.15 ? `${slug(name).replace(/-/g, '.')}@example.com` : '',
    pick(COMPANIES),
    pick(ROLES),
    linkedinDate(int(20, 1500)),
  ]);
}

const csv = [
  'Notes:',
  '"When exporting your connection data, you may notice that some of the email addresses are missing. You will only see email addresses for connections who have allowed their connections to see or download their email address using this setting https://www.linkedin.com/psettings/privacy/email. You can learn more here https://www.linkedin.com/help/linkedin/answer/261"',
  '',
  'First Name,Last Name,URL,Email Address,Company,Position,Connected On',
  // Demo size (Oct 18): 120 rows made the map too crowded to present, so only the first 30 are
  // written (the 6 seed overlaps + 24 new). All 120 are still generated so the random sequence,
  // and with it every other demo file, stays byte-identical.
  ...rows.slice(0, DEMO_CSV_ROWS).map((r) => r.map(csvEscape).join(',')),
].join('\n');
writeFileSync(`${OUT}Connections.csv`, csv + '\n');

// ---------------------------------------------------------------------------
// calendar-events.json — sample meetings (offsets from today)
// ---------------------------------------------------------------------------
const calendar = [
  { id: 'demo_evt_1', title: 'Coffee with John', dayOffset: 0, hour: 15, minute: 30, durationMin: 45, attendeeEmails: ['john.park@example.com'] },
  { id: 'demo_evt_2', title: 'Resume review', dayOffset: 1, hour: 11, minute: 0, durationMin: 30, attendeeEmails: ['abbey.chen@example.com'] },
  {
    id: 'demo_evt_3',
    title: 'Data Science Club officers sync',
    dayOffset: 1,
    hour: 18,
    minute: 0,
    durationMin: 60,
    attendeeEmails: people.filter((p) => p.primaryTag === 'Clubs' && p.email).slice(0, 3).map((p) => p.email!),
  },
];
writeFileSync(`${OUT}calendar-events.json`, JSON.stringify(calendar, null, 2) + '\n');

// ---------------------------------------------------------------------------
// roster.pdf — one-page fake club roster for snap to add
// ---------------------------------------------------------------------------
const roster = Array.from({ length: 8 }, (_, i) => {
  const name = uniqueName();
  const role = ['President', 'Vice President', 'Treasurer', 'Secretary', 'Events Lead', 'Outreach Lead', 'Workshop Lead', 'Design Lead'][i]!;
  return { name, role, email: `${slug(name).replace(/-/g, '.')}@example.com`, year: pick(['Junior', 'Senior', 'Sophomore']) };
});

const pdf = await PDFDocument.create();
// pdf-lib stamps the current time into the file; fix it so every run is byte-identical.
const FIXED_DATE = new Date('2026-10-17T00:00:00Z');
pdf.setCreationDate(FIXED_DATE);
pdf.setModificationDate(FIXED_DATE);
const page = pdf.addPage([612, 792]);
const font = await pdf.embedFont(StandardFonts.Helvetica);
const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
page.drawText('UW Data Science Club', { x: 56, y: 720, size: 22, font: bold });
page.drawText('Fall 2026 officers (sample data, fictional people)', { x: 56, y: 696, size: 12, font, color: rgb(0.35, 0.35, 0.35) });
const cols = [56, 210, 340, 520];
const header = ['Name', 'Role', 'Email', 'Year'];
header.forEach((h, i) => page.drawText(h, { x: cols[i]!, y: 650, size: 11, font: bold }));
page.drawLine({ start: { x: 56, y: 642 }, end: { x: 572, y: 642 }, thickness: 0.8, color: rgb(0.6, 0.6, 0.6) });
roster.forEach((r, row) => {
  const y = 620 - row * 26;
  [r.name, r.role, r.email, r.year].forEach((v, i) => page.drawText(v, { x: cols[i]!, y, size: 10.5, font }));
});
writeFileSync(`${OUT}roster.pdf`, await pdf.save());

console.log(
  `demo/: seed.json (${people.length} people, ${links.length} links, ${reminders.length} reminders), ` +
    `Connections.csv (${Math.min(rows.length, DEMO_CSV_ROWS)} rows), calendar-events.json (${calendar.length}), roster.pdf (${roster.length})`,
);
