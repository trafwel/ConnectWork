/**
 * Step S — Style switching (intermediary step after M6, requested Oct 17) · done
 *
 * WHAT THIS ACHIEVES
 *   The user picks a STYLE (Neutral or Atlas, the theme-canvas direction) and a MODE
 *   (System, Light, Dark) in Settings → Appearance. Everything restyles instantly.
 *
 * HOW IT FITS
 *   index.css defines one palette per style/mode as CSS variables; this file only sets
 *   <html data-style="…" class="dark?">. index.html runs the same logic BEFORE React
 *   loads, so a reload never flashes the wrong theme. Saved per device in localStorage:
 *   it's a display preference, not the user's data (so it isn't in backups).
 *
 * FIX STEP 2 (Oct 17): a third choice, REMINDERS (Flag or Ripple). Like the style, it's a
 *   <html data-reminders="…"> attribute and CSS does the rest, so switching re-renders nothing.
 *
 * KEEP IN SYNC
 *   The inline script in index.html repeats parseAppearance + applyAppearance in plain JS
 *   (it must run before any module loads). Same key, same defaults.
 */
import { useEffect, useState } from 'react';

export type Style = 'neutral' | 'atlas';
export type Mode = 'system' | 'light' | 'dark';
/** How a due/overdue follow-up shows on the map: a pennant + pulse, or rings rippling out. */
export type ReminderStyle = 'flag' | 'ripple';
export interface Appearance {
  style: Style;
  mode: Mode;
  reminders: ReminderStyle;
}

export const APPEARANCE_KEY = 'cw-appearance';
export const DEFAULT_APPEARANCE: Appearance = { style: 'neutral', mode: 'system', reminders: 'flag' };

/** Anything unexpected (missing, corrupted, an old format) falls back to the defaults. */
export function parseAppearance(raw: string | null): Appearance {
  try {
    const v = JSON.parse(raw ?? '{}') as Partial<Appearance>;
    return {
      style: v.style === 'atlas' ? 'atlas' : 'neutral',
      mode: v.mode === 'light' || v.mode === 'dark' ? v.mode : 'system',
      reminders: v.reminders === 'ripple' ? 'ripple' : 'flag', // older saves have no field: Flag
    };
  } catch {
    return DEFAULT_APPEARANCE;
  }
}

export const resolveDark = (mode: Mode, systemDark: boolean) => mode === 'dark' || (mode === 'system' && systemDark);

const systemDark = () => window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;

export function applyAppearance(a: Appearance, root: HTMLElement = document.documentElement): void {
  root.dataset.style = a.style;
  root.dataset.reminders = a.reminders;
  root.classList.toggle('dark', resolveDark(a.mode, systemDark()));
  root.style.colorScheme = resolveDark(a.mode, systemDark()) ? 'dark' : 'light'; // native scrollbars, form controls
}

function load(): Appearance {
  try {
    return parseAppearance(localStorage.getItem(APPEARANCE_KEY));
  } catch {
    return DEFAULT_APPEARANCE; // storage blocked (private window): still works, just not remembered
  }
}

/** Current appearance + setter; follows the OS light/dark switch live while mode is "system". */
export function useAppearance(): [Appearance & { dark: boolean }, (next: Partial<Appearance>) => void] {
  const [appearance, setAppearance] = useState(load);
  const [osDark, setOsDark] = useState(systemDark);

  // Apply now, and re-apply DIRECTLY on every OS change. Relying only on a state change was
  // fragile: if the boot script and React saw different OS values during load, the next OS
  // switch could be a "no change" for React and the page would never update (step S review).
  useEffect(() => {
    applyAppearance(appearance);
    const mq = window.matchMedia?.('(prefers-color-scheme: dark)');
    const onChange = () => {
      applyAppearance(appearance);
      setOsDark(mq.matches); // only for consumers of `dark` (e.g. toasts)
    };
    mq?.addEventListener('change', onChange);
    return () => mq?.removeEventListener('change', onChange);
  }, [appearance]);

  const update = (next: Partial<Appearance>) => {
    const merged = { ...appearance, ...next };
    setAppearance(merged);
    try {
      localStorage.setItem(APPEARANCE_KEY, JSON.stringify(merged));
    } catch {
      // not remembered, but applied for this visit
    }
  };

  return [{ ...appearance, dark: resolveDark(appearance.mode, osDark) }, update];
}
