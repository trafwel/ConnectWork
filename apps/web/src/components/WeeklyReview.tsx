/**
 * M8 — WeeklyReview panel: the agent plans, you approve, it does the work · Owner: Person B · ~1 h
 *
 * WHAT THIS ACHIEVES
 *   The demo's finale. One "Review my week" button → a short plan of 5–6
 *   actions, each with a reason and (where useful) a ready-to-send draft.
 *   Approving an action actually does it: sets the reminder, accepts the link,
 *   copies the message. This is what makes Connectwork an agent for the Cook
 *   Smarter track rather than a chatbot.
 *
 * HOW IT FITS
 *   TopBar "Review my week" → useStore rightPanel = 'weekly' → this panel →
 *   weeklyCandidates() + buildSummary() → aiPost('/weekly-review') →
 *   action cards → Approve → db/actions.ts (addReminder, acceptLink) + clipboard.
 *
 * STEPS
 *   1. TopBar: a primary "Review my week" button that sets rightPanel 'weekly'
 *      (add a setRightPanel action to the store if needed).
 *   2. On mount: load people/links/reminders from Dexie, build candidates and
 *      summary, call aiPost('/weekly-review', { summary, candidates, today }, WeeklyReviewResponse).
 *      Show "Looking at your week…" while waiting; show res.message on error
 *      with a Retry button. Zero candidates → "You're all caught up" without calling the AI.
 *   3. Render the headline, then one card per action: title, why, and if
 *      draftMessage exists an editable <textarea> plus Copy.
 *      Hover/focus a card → setHighlights(action.personIds).
 *   4. Approve (per card):
 *        - reminderDate → addReminder(personIds[0], reminderDate, title)
 *        - kind 'accept_link' && linkId → acceptLink(linkId)
 *        - draft → navigator.clipboard.writeText(text) + toast "Draft copied"
 *        - offer "Add to calendar" (lib/ics.ts; Google Calendar after M11)
 *      Mark the card done (checkmark, muted). Approve all = every card.
 *   5. Approving must NOT change lastContact — only real contact does (Log contact).
 *
 * DONE WHEN
 *   - On the seed: ≤ 6 actions including John Park; approving creates the
 *     reminders, accepts suggested links and copies editable drafts.
 *
 * Guide: §15.3
 */

export function WeeklyReview() {
  // TODO(M8) steps 2–5
  return null;
}
