import { describe, expect, it } from 'vitest';
import { DEFAULT_APPEARANCE, parseAppearance, resolveDark } from './appearance';

describe('appearance', () => {
  it('parses saved choices and falls back to defaults for anything unexpected', () => {
    expect(parseAppearance('{"style":"atlas","mode":"dark","reminders":"ripple"}')).toEqual({ style: 'atlas', mode: 'dark', reminders: 'ripple' });
    // A save from before the Reminders choice existed keeps its style and gets Flag.
    expect(parseAppearance('{"style":"atlas","mode":"dark"}')).toEqual({ style: 'atlas', mode: 'dark', reminders: 'flag' });
    expect(parseAppearance(null)).toEqual(DEFAULT_APPEARANCE);
    expect(parseAppearance('not json')).toEqual(DEFAULT_APPEARANCE);
    expect(parseAppearance('{"style":"retro","mode":"sepia","reminders":"confetti"}')).toEqual(DEFAULT_APPEARANCE);
  });
  it('resolves System to the OS setting, and Light/Dark to themselves', () => {
    expect(resolveDark('system', true)).toBe(true);
    expect(resolveDark('system', false)).toBe(false);
    expect(resolveDark('light', true)).toBe(false);
    expect(resolveDark('dark', false)).toBe(true);
  });
});
