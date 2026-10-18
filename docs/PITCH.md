# Connectwork: 3-minute pitch

**Two speakers.** **A** (Luke) speaks; **B** (Raio) drives the laptop and takes the technical part. Swap if you like. Each line is about the length you can say in its time slot, roughly 150 words per minute. *Italics* are what's on screen.

**Before you go up:**
- Record the demo answers ([DEMO_DAY.md](DEMO_DAY.md)) and run `DEMO_CACHE=replay pnpm dev`, so nothing waits on Gemini.
- Settings → Reset demo data → Import `demo/Connections.csv` → Sort with AI → Accept all.
- Then reload, close any panels, and leave the map open.

---

## 0:00 – 0:20 · The problem (A)

> "Quick question: who in your LinkedIn could get you an intro at Microsoft right now?
> Most of us have hundreds of connections and no idea. The network is there; we just can't *see* it, and we forget to follow up.
> We built **Connectwork**: your network as a map, with an AI agent that does the remembering."

*The map: you in the middle, close people inside, everyone else further out.*

## 0:20 – 0:40 · What it is (A)

> "The rings are how close you are. Colors are where you know people from.
> We started from a real LinkedIn export, the file anyone can download, so no API and no scraping, and Gemini sorted 114 contacts into rings and groups. **Nothing is saved until you approve it.**"

*B points at the Work cluster, then clicks **Groups**: each group is now one node with a count. Click **Work** to open it, then back to **Map**.*

## 0:40 – 1:05 · Ask (A, B types)

> "So, Microsoft."

*B types **"Who do I know at Microsoft?"** and presses Enter. People light up on the map; the answer card names them.*

> "Plain English in, people lit up on the map. The model writes the sentence, but *our code* decides who's highlighted, so it can't invent a contact."

## 1:05 – 1:35 · The hidden link (A, B clicks)

> "Here's the part we're proudest of."

*B clicks **Find hidden links**. The review sheet shows **Abbey Chen ↔ John Park**, 90%: both UW, both Microsoft.*

> "Abbey is a PM at Microsoft. John is a UW student who interned there. They're both in my network, and they've never been introduced. Connectwork noticed.
> Accept, and the line is on my map, labelled with *why* they're connected."

*B clicks **Accept**, then clicks John: everyone else fades, and the line to Abbey says "both UW, both Microsoft".*

## 1:35 – 2:05 · Before the meeting (A, B clicks)

> "And I'm having coffee with John today."

*B clicks the **Coffee with John** chip in the meeting strip: John is highlighted and the prep card opens.*

> "One click before the meeting: how I know him, and what to bring up, including the follow-up I owe him from the career fair.
> I see him faded and pushed outward: seven months since we talked. One tap, **Log this meeting**, and he's back."

*B clicks **Log this meeting**; John stops fading.*

## 2:05 – 2:25 · The weekly agent (A, B clicks)

> "Every week it plans for me."

*B clicks **Review my week**: follow-ups and reconnects, each with a draft.*

> "It proposes; I approve. Approve reschedules the reminder or accepts the link. It never sends anything on its own."

## 2:25 – 2:50 · How it's built (B)

> "Two choices we care about.
> **Your network never leaves your browser.** There are no accounts and no database on our server; it only forwards one AI request at a time. On Gemini's free tier the app says so and won't send real calendar data at all.
> **And it doesn't fall over on stage.** Every AI answer is checked in code, and the demo replays recorded answers if the Wi-Fi dies. It's also usable without the map: a full list view and keyboard path."

*Optional, if there's a second: switch to **List**.*

## 2:50 – 3:00 · Close (A)

> "Connectwork turns 'I should really keep in touch' into a map you can act on. Built with Gemini, running in your browser. Thank you!"

---

## If something goes wrong

- **An AI step hangs:** say "while that thinks: everything you see is stored only in this browser", then click the step again. Answers you recorded come back instantly in replay; with no server at all, the app shows the saved answer and labels it.
- **Hidden links shows other pairs first:** scroll to Abbey ↔ John and say "this one's the story".
- **A panel covers the map:** press Escape (it closes the card or panel).

## Likely questions (one line each)

- **Where's the data?** IndexedDB in your browser; the server stores nothing and logs only route, status and time.
- **How do you stop the AI making things up?** Structured output validated with zod, every person id checked against your data, and "lost touch" and follow-ups computed in code. The model only writes the wording.
- **Why not the LinkedIn API?** It needs partner approval; the data export is yours and works today.
- **Google Calendar?** Optional sign-in; the token stays in memory, and events never touch our server. The demo uses sample meetings.
- **Accessibility?** List view, full keyboard path, a colorblind-safe palette, and color is never the only signal.
- **What's next?** The texting agent (text "who should I catch up with?" and your open tab answers) and deploying on our own domain.
