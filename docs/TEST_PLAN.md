# Connectwork — Manual test plan

Every feature built so far (52 tests, M1–M9 and Appearance), as steps and what you should see. Generated from [`testing/connectwork-test-run.html`](testing/connectwork-test-run.html) (the same tests as an interactive checklist; the team copy with shared results is a private claude.ai artifact). Edit the tests there and regenerate this file.

**Before you start:** get the latest `main`, which has every milestone through M10 (`git switch main && git pull && pnpm install`). Then run `pnpm dev`, open http://localhost:5173, and use **Settings → Reset demo data**. The server lives at `localhost:8787/api/…`; its root address answering 404 is normal. Import tests use `demo/Connections.csv`; Snap tests use `demo/roster.pdf`. The AI runs on Gemini's free tier, so use the fictional demo data, or your own business card, only (never someone else's). Demo dates are relative to today.

| Section | Tests |
| --- | --- |
| [M1 · Your data](#m1--your-data) | 6 |
| [M2 · The ring map](#m2--the-ring-map) | 4 |
| [M3 · Person card and quick add](#m3--person-card-and-quick-add) | 6 |
| [M4 · CSV import](#m4--csv-import) | 5 |
| [M5 · Ask Connectwork](#m5--ask-connectwork) | 5 |
| [M6 · AI suggestions you review](#m6--ai-suggestions-you-review) | 4 |
| [Appearance](#appearance) | 2 |
| [M7 · Flags, filters, reminders](#m7--flags-filters-reminders) | 6 |
| [M8 · Weekly review](#m8--weekly-review) | 7 |
| [M9 · Snap to add](#m9--snap-to-add) | 7 |

## M1 · Your data

Seeding, backups, reset and delete.

### Demo network on first load `m1-first-load`

**Do**
1. Settings → Reset demo data
2. Close Settings

**You should see**
- The map shows 30 people in three rings
- The All tab on the left says 40

### Data survives a reload `m1-persist`

**Do**
1. Change any person’s company in their card
2. Reload the page

**You should see**
- The change is still there

### Export a backup `m1-export`

**Do**
1. Settings → Export backup

**You should see**
- A file named connectwork-backup-YYYY-MM-DD.json downloads
- A toast says “Backup downloaded”

### Import asks before replacing `m1-import-confirm`

**Do**
1. Settings → Import backup → choose the file you exported
2. Click Cancel
3. Import it again → Replace

**You should see**
- It first asks “Replace all your data with …?”
- Cancel changes nothing
- Replace says “Backup restored”

### A wrong file is refused `m1-bad-backup`

**Do**
1. Settings → Import backup → choose any other .json file (e.g. the repo’s package.json) → Replace

**You should see**
- A red message says it isn’t a Connectwork backup
- Your people are unchanged

### Delete everything, then reset `m1-delete`

**Do**
1. Settings → Delete everything → Yes, delete
2. Reload
3. Settings → Reset demo data

**You should see**
- The map is empty and stays empty after reload
- Reset brings back 30 people
- Your “About you” text is still there

## M2 · The ring map

Layout, selection, zoom and keyboard.

### Rings and clusters `m2-rings`

**Do**
1. Look at the map

**You should see**
- Three rings around “You”
- People grouped by color: Work at the top, then School, Friends, Family, Clubs clockwise
- A legend in the bottom-left

### Click to focus `m2-select`

**Do**
1. Click Samuel Alvarez

**You should see**
- He moves to the center and his card opens
- His links turn bold; other links fade
- People linked to him show their names

### Zoom and pan `m2-zoom`

**Do**
1. Scroll to zoom in, drag to pan
2. Click Reset view

**You should see**
- More names appear as you zoom in
- Reset view returns to the start and hides itself

### Keyboard only `m2-keyboard`

**Do**
1. Press Tab until a person is focused
2. Press Enter, then Escape

**You should see**
- A dashed focus ring shows who is focused
- Enter opens their card; Escape closes it

## M3 · Person card and quick add

Editing in place, reminders, links, undo.

### Edit and save `m3-edit`

**Do**
1. Open John Park
2. Change Role, press Enter
3. Reload

**You should see**
- The new role is kept

### Change ring with arrow keys `m3-ring-keys`

**Do**
1. In a card, click the ring picker
2. Press ← or →

**You should see**
- The selected ring changes and the person moves on the map

### Follow-up tag makes a reminder `m3-followup`

**Do**
1. Open someone with no reminders
2. Type follow-up in “Add tag”, press Enter

**You should see**
- A “Follow up” reminder appears, due in 7 days

### Quick add with N `m3-quickadd`

**Do**
1. Press N
2. Type a name, press Enter

**You should see**
- The person appears on the map right away
- A toast offers “Open card”

### Delete a person, then undo `m3-delete-undo`

**Do**
1. Open someone with a link and a reminder
2. Delete person → Delete
3. Click Undo in the toast

**You should see**
- They come back with their links and reminders

### Remove a link, then undo `m3-link-undo`

**Do**
1. In a card’s “Connected to”, click Remove
2. Click Undo

**You should see**
- The link comes back

## M4 · CSV import

Use demo/Connections.csv from the repo.

### Preview before importing `m4-preview`

**Do**
1. Click Import
2. Drop demo/Connections.csv on the box (or click to choose it)

**You should see**
- “16 people found in your LinkedIn export · 10 new people · 6 already here”

### Import lands on the outer ring `m4-import`

**Do**
1. Click Import 114

**You should see**
- 114 gray people appear on the outer ring
- The toast offers Sort with AI and Undo

### Importing again adds nobody `m4-reimport`

**Do**
1. Import the same file again

**You should see**
- The preview says 0 new people

### Undo an import `m4-undo`

**Do**
1. Reset demo data, import the file, click Undo in the toast

**You should see**
- Back to 30 people

### Drop zone by keyboard `m4-keyboard` (open issue M4-I4)

**Do**
1. Open Import
2. Press Tab until the drop zone is focused
3. Press Space or Enter

**You should see**
- A focus ring shows on the drop zone
- The file picker opens

## M5 · Ask Connectwork

Live Gemini. Answers vary in wording; check who gets highlighted.

### Who do I know at Microsoft? `m5-microsoft`

**Do**
1. Type it in the top box, press Enter

**You should see**
- Abbey Chen, Nina Walsh, Owen Alvarez and John Park are highlighted
- Everyone else fades

### Who should I follow up with this week? `m5-due`

**Do**
1. Ask it

**You should see**
- The Due view turns on
- The people with flags are highlighted

### Who have I lost touch with? `m5-lost-touch`

**Do**
1. Ask it

**You should see**
- Exactly Aisha Larsen, Priya Alvarez, Omar Choi, Hana Choi and John Park
- The Drifting tab turns on

### A question with no answer `m5-nobody`

**Do**
1. Ask “Who do I know at Apple?”

**You should see**
- It says you don’t know anyone there; nothing is highlighted

### Cancel a slow question `m5-cancel`

**Do**
1. Ask anything and click Cancel on “Thinking…” right away
2. Wait 15 seconds

**You should see**
- Nothing appears afterwards

## M6 · AI suggestions you review

The AI proposes; nothing is saved until you accept.

### Find hidden links `m6-links`

**Do**
1. Reset demo data
2. Click Find hidden links
3. Hover a row in the review

**You should see**
- Abbey Chen ↔ John Park is suggested (“both Microsoft, both UW”)
- Dashed lines appear on the map
- Hovering a row highlights its two people

### Accept only one `m6-accept`

**Do**
1. Untick everything except Abbey ↔ John
2. Accept selected

**You should see**
- A solid line now joins Abbey and John
- The other dashed lines are gone

### Dismiss changes nothing `m6-dismiss`

**Do**
1. Run Find hidden links again
2. Click Dismiss

**You should see**
- Abbey ↔ John is not suggested again
- No dashed lines remain

### Sort an import with AI `m6-sort`

**Do**
1. Settings → About you: “UW CS junior, interning at Microsoft”
2. Import the CSV → Sort with AI
3. Accept all

**You should see**
- Each row has a reason about that person (e.g. “Software Engineer at Zillow”)
- Microsoft people are suggested for ring 2
- The gray band turns into colored clusters in their sectors

## Appearance

Settings → Appearance.

### Atlas style `s-atlas`

**Do**
1. Style → Atlas
2. Reload

**You should see**
- Paper-colored background, solid ink rings, mono labels
- The choice is kept after reload

### Dark and System modes `s-dark`

**Do**
1. Mode → Dark
2. Mode → System, then switch macOS between Light and Dark

**You should see**
- Dark works in both styles
- System follows macOS without a reload

## M7 · Flags, filters, reminders

Reset demo data first.

### Reminder flags `m7-flags`

**Do**
1. Look at the map

**You should see**
- 4 people have small flags
- Overdue flags are orange-red; others are dark
- Flags gently pulse

### Filter tabs `m7-tabs`

**Do**
1. Click Work, then Drifting, then All

**You should see**
- Counts on the right add up to the All count
- Other people fade; nobody moves

### Due panel `m7-due-panel`

**Do**
1. Click Due
2. Click Done on one row, Snooze 1 week on another

**You should see**
- A panel lists reminders, overdue first
- Done removes the row and that person’s flag
- Snooze moves it a week out

### Add to calendar `m7-calendar`

**Do**
1. In the Due panel, click Add to calendar
2. Open the downloaded .ics file

**You should see**
- Your calendar app adds an all-day “Follow up: Name” event on the due date

### Export all reminders `m7-export-all`

**Do**
1. Settings → Export all reminders

**You should see**
- One .ics file with every open reminder

### Pulse respects Reduce Motion `m7-reduce-motion` (open issue M7-O2)

**Do**
1. macOS System Settings → Accessibility → Display → Reduce motion: on
2. Look at the flags

**You should see**
- Flags stop pulsing (they stay visible)

## M8 · Weekly review

Live Gemini. Reset demo data first. The plan’s wording varies; check what it does.

### Review my week `m8-plan`

**Do**
1. Click Review my week (top bar)

**You should see**
- “Looking at your week…”, then a headline and 5–6 action cards
- John Park is in it
- Each card says why, using real dates or shared schools

### Who a card is about `m8-hover`

**Do**
1. Hover an action card

**You should see**
- Its person (or two people) is highlighted on the map
- Moving away restores what was highlighted before

### Approve a follow-up `m8-approve-followup`

**Do**
1. Approve “Follow up with John Park”
2. Open John’s card

**You should see**
- The card shows a check and “Done”
- John still has ONE reminder (moved to the plan’s date), not two
- His “last contact” did not change

### Approve a reconnect `m8-approve-reconnect`

**Do**
1. Approve a “Reconnect with …” card

**You should see**
- That person gets a new reminder on the suggested date

### Drafts are editable `m8-drafts`

**Do**
1. Edit a draft in a card, then click Copy
2. Paste it somewhere

**You should see**
- Your edited text is what gets pasted
- Drafts don’t invent meetings or places that aren’t in the person’s data

### The plan stays put `m8-roundtrip`

**Do**
1. Click a person’s name in a card to open their card
2. Close the card

**You should see**
- You’re back on the same plan, approvals still checked, without “Looking at your week…” again

### Draft a message from a card `m8-draft-card`

**Do**
1. Open John Park → Message → Draft a message

**You should see**
- A short message that uses his real notes (CSE 332, the Microsoft internship)
- Copy works

## M9 · Snap to add

Live Gemini. Free tier: test with YOUR OWN card or the demo files, never someone else’s card (it would send their details to Google).

### A roster PDF `m9-roster`

**Do**
1. Click Snap → Choose a photo or PDF → demo/roster.pdf

**You should see**
- “Reading…”, then the review: “Add 8 people from roster.pdf”
- All 8 are ticked, each with a role and the Clubs tag

### Add them `m9-accept`

**Do**
1. Accept all

**You should see**
- 8 new people appear on the outer ring (Clubs color)
- Their card says last contact “Today”

### Snapping again finds them `m9-dedupe`

**Do**
1. Snap demo/roster.pdf again

**You should see**
- All 8 rows are UNticked and say “Already in your network as …”
- Dismiss changes nothing

### Your own business card `m9-own-card`

**Do**
1. Take a photo of YOUR card (good light, card fills the frame)
2. Get it onto this Mac (AirDrop or Photos) and choose it in Snap

**You should see**
- A thumbnail shows while it reads
- “Add 1 person from …” with your name, role and company copied exactly
- Fields not on the card are left empty (no guessed email or LinkedIn)

### An iPhone HEIC photo `m9-heic`

**Do**
1. Choose an iPhone photo in HEIC format (the default when AirDropped)

**You should see**
- Either it works, or a plain message explains how to switch the camera to “Most Compatible” (JPEG). No crash.

### A file that is too big or the wrong type `m9-big`

**Do**
1. Choose a PDF over 7 MB, or a non-image file

**You should see**
- A plain message: the 7 MB limit, or “Choose a photo (JPEG, PNG, WebP) or a PDF”

### When the AI is busy `m9-busy`

**Do**
1. If Snap says “The agent is busy”, wait a minute and try again

**You should see**
- It works on a later try (the free tier allows only a few requests per minute)
