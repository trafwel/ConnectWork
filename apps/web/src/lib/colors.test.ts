import { describe, expect, it } from 'vitest';
import { contrastRatio, DEFAULT_TAGS, readableOn } from './colors';

describe('tag colors', () => {
  it('computes WCAG contrast', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 0);
    expect(contrastRatio('#FFFFFF', '#FFFFFF')).toBeCloseTo(1, 5);
  });

  it('picks initials that read at 4.5:1 on every default tag', () => {
    for (const tag of DEFAULT_TAGS) {
      expect(contrastRatio(tag.color, readableOn(tag.color)), tag.name).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('keeps the two blue tags apart by lightness', () => {
    const work = DEFAULT_TAGS.find((t) => t.name === 'Work')!.color;
    const clubs = DEFAULT_TAGS.find((t) => t.name === 'Clubs')!.color;
    expect(contrastRatio(work, clubs)).toBeGreaterThan(1.6);
  });
});
