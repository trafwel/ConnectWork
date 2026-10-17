/**
 * M3 — Single-key shortcuts · done
 *
 * WHAT THIS ACHIEVES
 *   Shortcuts like N for Quick add that never fire while you're typing in a field
 *   or while a dialog is open.
 *
 * Guide: §7.2
 */
import { useEffect } from 'react';

function isTyping(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
}

/** Single-key shortcut that ignores keystrokes while the user is typing or a dialog is open. */
export function useHotkey(key: string, handler: () => void) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping(e.target)) return;
      if (document.querySelector('[role="dialog"]')) return;
      if (e.key.toLowerCase() === key.toLowerCase()) {
        e.preventDefault();
        handler();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [key, handler]);
}
