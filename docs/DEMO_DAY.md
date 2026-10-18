# Demo day: record the AI answers (M12)

> **Oct 18 status:** `demo/demo-cache.json` holds a full recording of the pitch flow, made and replay-checked on Oct 18. Every step answered in about 0.1 s, after Reset demo data, versus 15–32 s live. It's valid for **Oct 18 only**; on any other day, record again (section 1).
>
> **Two fixes made this possible** (polish step): imported people now get repeatable ids, and the network summary is in a fixed order. Before that, every re-import changed the requests, so recorded answers could never match after an import.

The demo shouldn't depend on hackathon Wi-Fi or on Gemini's free tier, which was slow and rate-limited during our testing. So on the morning we present, we record every AI answer the scripted demo needs. Then:

- **Replay:** the server answers from the recording, so there are no Gemini calls and each answer takes about 0.3 s instead of 4–75 s.
- **Offline:** if the server can't be reached at all, the browser answers from the same recording and shows a small "Showing a saved demo answer" note.

**Record on the day you present.** A recorded answer is found by a hash of the exact request. Many requests contain dates relative to today (last contact, meeting times, "today"), so a recording from yesterday won't match. Classify and Snap (the roster) don't depend on the date.

## 1. Record (about 10 minutes, one person, demo data only)

1. Stop `pnpm dev` if it's running, then start it in record mode:

   ```bash
   DEMO_CACHE=record pnpm dev
   ```

2. Open http://localhost:5173 → **Settings → Reset demo data**.
3. Run the scripted demo **in this exact order**, once, without other edits:
   1. **Import** → `demo/Connections.csv` → Import.
   2. **Sort with AI** → **Accept all**.
   3. Ask: *"Who do I know at Microsoft?"* (and any other question you'll ask on stage, word for word).
   4. **Find hidden links** → **Accept all** (accepting only some changes the later requests).
   5. Click the **Coffee with John** meeting (prep card), then **Log this meeting**.
   6. **Review my week**.
   7. **Snap** → `demo/roster.pdf` (cancel the review, or accept it if that's part of your demo).
   8. Any **Draft a message** you'll show.
4. The terminal shows `cache=miss` for each AI call, and `demo/demo-cache.json` grows.

## 2. Check the replay

1. Stop `pnpm dev`, then start it again in replay mode:

   ```bash
   DEMO_CACHE=replay pnpm dev
   ```

2. **Settings → Reset demo data**, then run the same steps in the same order.
3. Every AI line in the terminal must say **`cache=hit`**. A `miss` means a request changed (a different order, wording or click), so redo that step the way you recorded it.

## 3. Check the offline fallback

1. Keep the browser tab open and stop the server only (Ctrl-C stops both, so then start just the web app: `pnpm --filter web dev`).
2. Ask the recorded question again: the answer appears with the note "Showing a saved demo answer". An unrecorded question says "Can't reach the Connectwork server."

## 4. Keep it

- Commit `demo/demo-cache.json`. It contains answers about the **fictional** demo people only; never record with real data.
- For the deployed site, rebuild after recording (`pnpm build`, M14), so the browser bundle includes the recording.
- Don't touch the demo data between recording and presenting: every edit changes later requests.

## Running a recording copy next to your normal app

To record without stopping your own `pnpm dev`, run a second copy on other ports (this is how M12 was tested):

```bash
cd apps/server && PORT=8788 DEMO_CACHE=record pnpm exec tsx src/index.ts
```

```bash
cd apps/web && API_PROXY_TARGET=http://localhost:8788 pnpm exec vite --port 5174 --strictPort
```

Then use http://localhost:5174. It's a different address, so it has its own browser data and starts from the seed.
