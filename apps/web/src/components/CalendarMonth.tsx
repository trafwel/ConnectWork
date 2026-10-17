/**
 * M14 — CalendarMonth (stretch, only if everything else is done) · Owner: Person A · ~1 h
 *
 * WHAT THIS ACHIEVES
 *   A month at a glance: every reminder and meeting on its day. Clicking a day
 *   highlights those people on the map. Nice to have; cut first if time is short.
 *
 * HOW IT FITS
 *   A "Calendar" tab in FilterTabs sets view 'calendar' (extend the store's view type);
 *   App renders this instead of the map. Reads db.reminders and db.meetings.
 *
 * STEPS
 *   1. Compute the grid: first day of the month → back to Monday; 6 rows × 7 columns.
 *   2. A CSS grid `grid-cols-7`; weekday headers; each cell = day number + up to 3
 *      items ("Follow up: John", "3:30 Coffee with John") + "+N more".
 *   3. Previous / next month buttons; today outlined.
 *   4. Day click → setHighlights(people with items that day) and switch back to the map.
 *   5. Each day cell is a <button> with an aria-label like "October 18, 2 items".
 *
 * DONE WHEN
 *   - Reminders and sample meetings appear on the right days; clicking a day highlights people.
 *
 * Guide: §21
 */

export function CalendarMonth() {
  // TODO(M14) steps 1–5
  return null;
}
