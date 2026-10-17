import { describe, expect, it } from 'vitest';
import { geometry, ringRadius, sectorAngle } from './layout';

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
