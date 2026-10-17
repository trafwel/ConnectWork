import { describe, expect, it } from 'vitest';
import { FALLBACK_COLOR, safeColor } from './colors';

describe('safeColor', () => {
  it('passes hex colors and replaces anything else', () => {
    expect(safeColor('#0072B2')).toBe('#0072B2');
    expect(safeColor('url(https://tracker.example/p)')).toBe(FALLBACK_COLOR);
    expect(safeColor('red; background: url(x)')).toBe(FALLBACK_COLOR);
    expect(safeColor(undefined)).toBe(FALLBACK_COLOR);
  });
});
