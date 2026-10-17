/**
 * M3 — A person's reminders · Owner: Person A · ~30 min (Add to calendar arrives in M7)
 *
 * WHAT THIS ACHIEVES
 *   Lists, adds, completes and deletes follow-up reminders for one person. Overdue
 *   dates turn orange-red so they stand out.
 *
 * STEPS
 *   1. useLiveQuery(() => db.reminders.where('personId').equals(personId).sortBy('dueDate'), [personId]).
 *   2. Each row: a checkbox (setReminderDone; aria-label `Mark "note" done`), the date
 *      (orange-red + medium weight if isOverdue), the note (struck through when done), and an
 *      icon-only delete button (aria-label `Delete reminder "note"`).
 *   3. Empty state: "No reminders".
 *   4. Add form: <Input type="date"> defaulting to today + 7 days, a note input, and an "Add"
 *      button → addReminder(personId, date, note), then clear the note.
 *
 * Guide: §7.3
 */

export function PersonReminders(_props: { personId: string }) {
  // TODO(M3) steps 1–4
  return null;
}
