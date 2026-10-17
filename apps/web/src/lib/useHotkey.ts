/**
 * M3 — Single-key shortcuts · done
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

import { useEffect } from 'react';

function isTyping(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target.isContentEditable;
}

/** Calls `handler` when `key` is pressed alone, outside text fields and dialogs. Pass a stable handler. */
export function useHotkey(key: string, handler: () => void): void {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return; // Cmd+N etc. belong to the browser
      if (isTyping(e.target) || document.querySelector('[role="dialog"]')) return;
      if (e.key.toLowerCase() !== key.toLowerCase()) return;
      e.preventDefault();
      handler();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [key, handler]);
}
