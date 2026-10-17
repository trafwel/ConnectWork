/**
 * M3 — Single-key shortcuts · ~15 min
 *
 * WHAT THIS ACHIEVES
 *   Shortcuts like N for Quick add that never fire while you're typing in a field or
 *   while a dialog is open.
 *
 * STEPS
 *   1. In a useEffect on [key, handler], add a window 'keydown' listener; remove it in cleanup.
 *   2. Ignore the event when: any of metaKey/ctrlKey/altKey is held; the target is an INPUT,
 *      TEXTAREA, SELECT or contentEditable element; or document.querySelector('[role="dialog"]')
 *      exists.
 *   3. If e.key matches (case-insensitive): preventDefault() and call handler().
 *   4. Callers pass a stable handler (useCallback) so the listener isn't re-added every render.
 *
 * Guide: §7.2
 */

export function useHotkey(_key: string, _handler: () => void): void {
  // TODO(M3) steps 1–3
}
