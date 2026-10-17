/**
 * M1 — Demo data generator (`pnpm seed`) · Owner: Person B · ~1 h
 *
 * WHAT THIS ACHIEVES
 *   A realistic, entirely fictional network that makes every feature demoable
 *   from the first second: 40 people across three rings, links inside groups,
 *   overdue reminders, drifting friends, a fake LinkedIn export, a club roster PDF
 *   and sample meetings. It also plants the demo story: Abbey Chen and John Park
 *   share a school and Microsoft but are NOT linked, so the AI can discover them (M6).
 *
 * HOW IT FITS
 *   Writes four files into demo/ (the current ones are already there, so you can
 *   build the app before this script — but regenerate when you change the shape):
 *     demo/seed.json            first-run network, loaded by apps/web/src/db/seed.ts
 *     demo/Connections.csv      fake LinkedIn export for M4 import
 *     demo/calendar-events.json sample meetings for M11
 *     demo/roster.pdf           club roster for M9 snap to add
 *
 * STEPS
 *   1. Setup:
 *        import { mkdirSync, writeFileSync } from 'node:fs';
 *        import { fileURLToPath } from 'node:url';
 *        import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';     // pnpm add -w -D pdf-lib
 *        const OUT = fileURLToPath(new URL('../demo/', import.meta.url)); mkdirSync(OUT, { recursive: true });
 *   2. Deterministic randomness, so every run writes identical files (mulberry32):
 *        let state = 20261017;
 *        function rand() { state |= 0; state = (state + 0x6d2b79f5) | 0;
 *          let t = Math.imul(state ^ (state >>> 15), 1 | state);
 *          t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
 *          return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }
 *        const pick = (xs) => xs[Math.floor(rand() * xs.length)];
 *        const int = (lo, hi) => lo + Math.floor(rand() * (hi - lo + 1));
 *   3. Fictional names: lists of first and last names (e.g. Maya, Ethan, Priya… /
 *      Alvarez, Bennett, Choi…), companies (Microsoft, Amazon, Google, Expedia Group,
 *      T-Mobile, Salesforce, Tableau, Zillow + a few made-up startups), roles, schools
 *      (University of Washington, Seattle University, University of British Columbia).
 *      Emails at @example.com; LinkedIn URLs end in "-demo". Keep a Set of used names.
 *   4. DATES AS OFFSETS, not dates: metDaysAgo, lastContactDaysAgo, dueInDays,
 *      dayOffset. The app turns them into dates when it loads (db/materialize.ts),
 *      so "due tomorrow" stays true on every day you demo.
 *   5. seed.json — { people, links, reminders }:
 *      a. The story pair, hand-written:
 *           p_abbey: Abbey Chen · ring 2 · Work · Microsoft PM · UW · email abbey.chen@example.com
 *                    · metDaysAgo 490 · lastContactDaysAgo 40 · a note about Azure onboarding
 *           p_john:  John Park · ring 2 · School + follow-up · UW · role "CS student, former
 *                    Microsoft intern (summer 2025)" · lastContactDaysAgo 210 (drifting)
 *      b. 38 more by plan: ring 1 → Family 3, Friends 4, Work 1; ring 2 → Work 4, School 4,
 *         Clubs 2, Friends 2; ring 3 → Work 6, School 5, Clubs 4, Friends 3.
 *         lastContactDaysAgo: ring 1 2–45, ring 2 10–150, ring 3 30–400.
 *      c. Make 4 people drift: two ring-1 at 150 and 120 days, two ring-2 at 260 and 300.
 *      d. Tag 3 ring-3 Work people 'intro'.
 *      e. Links inside each tag group (neighbors in the list, ~75% chance), stored with
 *         fromId < toId, plus Abbey ↔ a Work person ("same team") and John ↔ a School
 *         person ("CSE 332 study group"). NEVER Abbey ↔ John.
 *      f. Reminders: John due in 1 day ("Follow up after the career fair"), two overdue
 *         (−3 and −1 days), one in 5 days.
 *   6. Connections.csv — exactly LinkedIn's format:
 *        Notes:
 *        "When exporting your connection data, you may notice … (one quoted line)"
 *        <blank line>
 *        First Name,Last Name,URL,Email Address,Company,Position,Connected On
 *      First 6 rows: seed people that have a LinkedIn URL (tests dedupe on re-import);
 *      then generated rows up to 120. Dates like "15 Oct 2024". Quote values containing
 *      commas or quotes (double the quotes inside).
 *   7. calendar-events.json — 3 meetings as offsets: "Coffee with John" today 15:30
 *      (john.park@example.com), "Resume review" tomorrow 11:00 (abbey.chen@example.com),
 *      "Data Science Club officers sync" tomorrow 18:00 (3 Clubs people).
 *   8. roster.pdf — pdf-lib: one Letter page, title "UW Data Science Club", subtitle
 *      "(sample data, fictional people)", a 4-column table (Name, Role, Email, Year)
 *      with 8 officers.
 *   9. Print a one-line summary of the counts.
 *
 * DONE WHEN
 *   - `pnpm seed` prints "demo/: seed.json (40 people, ~25 links, 4 reminders),
 *     Connections.csv (120 rows), calendar-events.json (3), roster.pdf (8)" and running it
 *     twice produces byte-identical files.
 *
 * Guide: docs/IMPLEMENTATION_GUIDE.md §5.1
 */

// TODO(M1) steps 1–9
console.log('TODO(M1): demo data generator not implemented yet — demo/ already contains generated files.');
