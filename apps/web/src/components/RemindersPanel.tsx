/**
 * M7 — RemindersPanel: what's due this week · Owner: Person A · ~30 min
 *
 * WHAT THIS ACHIEVES
 *   A to-do list for relationships: every reminder due in the next 7 days or
 *   overdue, oldest first, with Done / Snooze / Add to calendar. Together with
 *   the pulsing flags on the map, it makes sure follow-ups don't slip.
 *
 * HOW IT FITS
 *   Shown on the right when useStore.filter === 'due'. Reads reminders with
 *   useLiveQuery; writes through db/actions.ts (setReminderDone, snoozeReminder);
 *   "Add to calendar" uses lib/ics.ts now and Google Calendar after M11.
 *
 * STEPS
 *   1. useLiveQuery: all reminders + the people they belong to.
 *   2. Filter with dueReminders(reminders, 7) from lib/people.ts; sort by dueDate.
 *   3. Each row: person name (button → selectPerson), note, date (orange-red and
 *      "overdue" text if isOverdue), and buttons Done, Snooze 1 week, Add to calendar.
 *   4. Empty state: "Nothing due this week."
 *
 * DONE WHEN
 *   - Done removes the row and the node's flag; Snooze moves it a week;
 *     the .ics file opens in a calendar app.
 *
 * Guide: §13.3
 */

export function RemindersPanel() {
  // TODO(M7) steps 1–4
  return null;
}
