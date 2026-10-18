import { describe, expect, it } from 'vitest';
import { burstPath, spiderLegsPath, spokeAngles, spokesPath, webThreadPath } from './decor';

/** Every "x y" pair after a path command letter. */
const points = (d: string) => [...d.matchAll(/[MLQ](-?[\d.]+) (-?[\d.]+)/g)].map((m) => [Number(m[1]), Number(m[2])]);

describe('map decor geometry', () => {
  it('spreads spokes around the circle, starting near 12 o’clock', () => {
    const a = spokeAngles(12);
    expect(a).toHaveLength(12);
    expect(Math.abs(a[0]! + Math.PI / 2)).toBeLessThan(0.05);
    for (let i = 1; i < a.length; i++) expect(a[i]!).toBeGreaterThan(a[i - 1]!);
  });

  it('draws a closed web thread that touches every spoke at the ring radius and sags inward between', () => {
    const angles = spokeAngles(8);
    const d = webThreadPath(100, 100, 50, angles, 0.12);
    expect(d.startsWith('M')).toBe(true);
    expect(d.endsWith('Z')).toBe(true);
    expect(d.match(/Q/g)).toHaveLength(8);
    const radii = points(d).map(([x, y]) => Math.hypot(x! - 100, y! - 100));
    // On-spoke points are at r = 50; the curve's control points sit closer to the center.
    expect(Math.max(...radii)).toBeCloseTo(50, 0);
    expect(Math.min(...radii)).toBeCloseTo(44, 0);
    expect(webThreadPath(100, 100, 50, [0, 1])).toBe(''); // fewer than 3 spokes: nothing
  });

  it('draws one segment per spoke', () => {
    expect(spokesPath(0, 0, 10, 100, spokeAngles(12)).match(/M/g)).toHaveLength(12);
  });

  it('makes a starburst whose points alternate outside and inside the ring', () => {
    const radii = points(burstPath(0, 0, 100, 10, 0.1)).map(([x, y]) => Math.hypot(x!, y!));
    expect(radii).toHaveLength(20);
    expect(radii[0]).toBeCloseTo(110, 0);
    expect(radii[1]).toBeCloseTo(90, 0);
  });

  it('gives the spider eight legs', () => {
    expect(spiderLegsPath(0, 0, 18).match(/M/g)).toHaveLength(8);
  });
});
