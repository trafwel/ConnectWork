import { describe, expect, it } from 'vitest';
import { geometry, ringForDistance, ringRadius, sectorAngle } from './layout';

describe('ring geometry', () => {
  it('scales rings with the smaller side', () => {
    const g = geometry(1000, 600);
    expect(g).toEqual({ cx: 500, cy: 300, base: 600 });
    expect(ringRadius(g, 1)).toBeLessThan(ringRadius(g, 2));
    expect(ringRadius(g, 3)).toBeLessThan(300); // outer ring fits inside the map
  });
  it('puts Work at 12 o’clock and unknown tags in the last sector', () => {
    expect(sectorAngle('Work')).toBeCloseTo(-Math.PI / 2);
    expect(sectorAngle('Some custom tag')).toBe(sectorAngle('LinkedIn'));
  });
});

describe('ringForDistance', () => {
  const g = geometry(1000, 800); // base 800: rings at 144, 256, 368
  it('gives each ring the band halfway to its neighbours', () => {
    expect(ringForDistance(g, 0)).toBe(1); // dropped on "You": closest ring
    expect(ringForDistance(g, 144)).toBe(1);
    expect(ringForDistance(g, 199)).toBe(1); // just inside the 1|2 midpoint (200)
    expect(ringForDistance(g, 200)).toBe(2);
    expect(ringForDistance(g, 256)).toBe(2);
    expect(ringForDistance(g, 311)).toBe(2); // 2|3 midpoint is 312
    expect(ringForDistance(g, 312)).toBe(3);
    expect(ringForDistance(g, 5000)).toBe(3); // far outside: widest ring
  });
});
