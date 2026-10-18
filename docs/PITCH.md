# Connectwork: 3-minute pitch

**Two speakers.** **A** (Luke) speaks and holds the phone; **B** (Raio) drives the laptop and takes the technical part. Swap if you like. Lines are timed at about 150 words per minute. *Italics* are what's on screen.

**Before you go up** (or before recording the video):
- **Laptop:** run `DEMO_CACHE=replay pnpm dev`. This server also runs the texting agent, so make sure the Photon echo bot is **not** running. The recorded answers only work on the day they were recorded; check [DEMO_DAY.md](DEMO_DAY.md) and re-record if needed.
- **Demo data:** Settings → Reset demo data → Import `demo/Connections.csv` → Sort with AI → **Accept all**. Leave the map open.
- **Texting:** Settings → Texting agent must say **Connected**. On the phone, open the iMessage thread with **+1 (628) 789-5362** and type *"Who have I lost touch with?"* without sending it.
- **Order:** follow the steps below **in order, with the same clicks** (Accept all; Log this meeting before Review my week). Recorded answers only match the same requests; anything else goes to live Gemini, which can take 15–30 s.

---

## 0:00 – 0:20 · The problem (A)

> "Quick question: who in your LinkedIn could get you an intro at Microsoft right now?
> Most of us have hundreds of connections and no idea. The network is there; we just can't *see* it, and we forget to follow up.
> So we built **Connectwork**: your network as a map, with an AI agent that does the remembering."

*The map: you in the middle, close people inside, everyone else further out.*

## 0:20 – 0:40 · The map (A, B clicks)

> "Rings are how close you are; colors are where you know people from.
> We imported a real LinkedIn export, the file anyone can download, so there's no API and no scraping. Gemini sorted everyone into rings and groups, and **nothing is saved until you approve it**.
> Too many people? Switch to **Groups**: one node per part of your life. Open one, and the map zooms in on it."

*B clicks **Groups**, opens **Work** (the map zooms in), then **Back**, then **Map**.*

## 0:40 – 1:00 · Ask (B types)

> "So, Microsoft."

*B types **"Who do I know at Microsoft?"** and presses Enter. People light up on the map, and the answer card names them.*

> "Plain English in, people lit up. The model writes the sentence, but *our code* decides who's highlighted, so it can't invent a contact."

## 1:00 – 1:25 · The hidden link (A, B clicks)

> "Here's the part we're proudest of."

*B clicks **Find hidden links**. First in the list: **Abbey Chen ↔ John Park**, 90%: "both UW, both Microsoft".*

> "Abbey is a PM at Microsoft. John is a UW student who interned there. Both are in my network, and they've never been introduced. Connectwork noticed."

*B clicks **Accept all**, then clicks **John**: everyone else fades, and his line to Abbey says why they're connected.*

## 1:25 – 1:50 · Before the meeting (A, B clicks)

> "And I'm having coffee with John today."

*B clicks the **Coffee with John** chip: the prep card opens.*

> "How I know him, what to bring up, and the career-fair follow-up I owe him. He's faded and drifting outward: seven months since we talked. One tap, **Log this meeting**, and he's back."

*B clicks **Log this meeting**; John stops fading.*

## 1:50 – 2:15 · Text it (A, on the phone)

> "But I'm not always at my laptop. So I can just text it."

*A sends **"Who have I lost touch with?"** to the Connectwork line. A few seconds later the laptop map lights up the drifting people, and the phone gets the answer, signed "— Connectwork (AI)".*

> "That's Photon on iMessage. The server never sees my network: it passes the text to my open laptop tab, the tab answers from my own data, and the reply comes back. Strangers who text this number get nothing."

## 2:15 – 2:30 · The weekly agent (B)

*B clicks **Review my week**: follow-ups and reconnects, each with a draft.*

> "And every week it plans for me: who to follow up with, who I'm drifting from, with drafts. It proposes; I approve. It never sends anything on its own."

## 2:30 – 2:50 · How it's built (B)

> "Two choices we care about. **Your network never leaves your browser**: no accounts, no database on our server. Gemini only sees what each question needs, and our code checks every answer.
> **And it holds up on stage**: recorded answers if the Wi-Fi dies, plus a full list view and keyboard path, so it works without the map at all."

## 2:50 – 3:00 · Close (A)

> "Connectwork turns 'I should really keep in touch' into a map you can act on, and an agent you can text. Thank you!"

---

## If something goes wrong

- **An AI step hangs:** say "while that thinks: everything you see is stored only in this browser", then click the step again. Recorded answers come back instantly; with no server at all, the app shows the saved answer and labels it.
- **The text doesn't come back within about 10 s:** say "it answers from my laptop, so here's the same question typed", then type it into Ask Connectwork and move on. The texted answer has one extra live Gemini step, to read what the text means.
- **Hidden links shows other pairs first:** scroll to Abbey ↔ John and say "this one's the story".
- **A panel covers the map:** press Escape (it closes the card or panel).

## Likely questions (one line each)

- **Where's the data?** IndexedDB in your browser. The server stores nothing and logs only route, status and time, never message text.
- **How does texting work without your data on the server?** The server relays the text over a live connection to your open tab; the tab answers from its own data and sends back only the reply.
- **What if a stranger texts it?** No reply at all. Only allow-listed numbers get answers, and every reply is signed as AI.
- **How do you stop the AI making things up?** Structured output validated with zod, every person id checked against your data, and "lost touch" and follow-ups computed in code. The model only writes the wording.
- **Why not the LinkedIn API?** It needs partner approval; the data export is yours and works today.
- **Google Calendar?** Optional sign-in; the token stays in memory, and events never touch our server. The demo uses sample meetings.
- **Accessibility?** List view, a full keyboard path, a colorblind-safe palette, and color is never the only signal.
- **What's next?** Deploying on our own domain, and agent memory, so a follow-up text like "remind me to email her" knows who "her" is.
