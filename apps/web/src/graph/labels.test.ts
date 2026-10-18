import { describe, expect, it } from 'vitest';
import type { Person } from '@connectwork/shared';
import { circleBox, placeLabels, relationshipLabel, type LabelCandidate } from './labels';

const measure = (c: LabelCandidate) => c.text.length * 7;
const name = (id: string, x: number, y: number, priority = 1, r = 10): LabelCandidate => ({ id, text: `Name ${id}`, x, y, r, priority, kind: 'name' });

describe('placeLabels', () => {
  it('puts a label below its node when there is room', () => {
    const [p] = placeLabels([name('a', 100, 100)], measure);
    expect(p!.cx).toBe(100);
    expect(p!.cy).toBeGreaterThan(100 + 10); // below the circle
  });

  it('never lets two placed labels overlap', () => {
    // Ten nodes squeezed together: some labels move, some are skipped, none overlap.
    const many = Array.from({ length: 10 }, (_, i) => name(String(i), 100 + i * 6, 100, 10 - i));
    const placed = placeLabels(many, measure);
    for (const a of placed)
      for (const b of placed)
        if (a !== b) {
          const apart = Math.abs(a.cx - b.cx) >= (a.width + b.width) / 2 || Math.abs(a.cy - b.cy) >= (a.height + b.height) / 2;
          expect(apart, `${a.id} vs ${b.id}`).toBe(true);
        }
    expect(placed.length).toBeLessThan(10);
  });

  it('places higher priority first, and moves the next one to another side', () => {
    const placed = placeLabels([name('low', 100, 100, 1), name('high', 104, 100, 5)], measure);
    const high = placed.find((p) => p.id === 'high')!;
    const low = placed.find((p) => p.id === 'low');
    expect(high.cy).toBeGreaterThan(100); // high got the best spot (below)
    expect(low && low.cy).toBeLessThan(100); // low went above instead
  });

  it('always shows a forced label (the selected person), even with no free spot', () => {
    const crowd = [name('x', 100, 100, 9), name('y', 100, 100, 8), name('z', 100, 100, 7), name('w', 100, 100, 6), name('sel', 100, 100, 1)];
    const placed = placeLabels(crowd, measure, { force: new Set(['sel']) });
    expect(placed.map((p) => p.id)).toContain('sel');
  });

  it('moves a name off a neighbouring node when it can, but still shows it when it cannot', () => {
    // A node sits right below 'a', so 'a' goes above instead.
    const [moved] = placeLabels([name('a', 100, 100)], measure, { obstacles: [circleBox(100, 125, 10)] });
    expect(moved!.cy).toBeLessThan(100);
    // Nodes on every side: no clean spot, so it falls back to the usual one (below).
    const boxed = [circleBox(100, 125, 12), circleBox(100, 75, 12), circleBox(150, 100, 12), circleBox(50, 100, 12)];
    const [fallback] = placeLabels([name('a', 100, 100)], measure, { obstacles: boxed });
    expect(fallback!.cy).toBeGreaterThan(100);
  });
});

describe('placeLabels: link pills along their line (polish)', () => {
  it('spreads two pills whose midpoints collide by sliding one along its own line', () => {
    const along = (x1: number, y1: number, x2: number, y2: number) =>
      [0.5, 0.64, 0.36].map((t): [number, number] => [x1 + (x2 - x1) * t - (x1 + x2) / 2, y1 + (y2 - y1) * t - (y1 + y2) / 2]);
    // Like the screenshot: two ~200 px lines leaving the same person at nearby angles.
    const pill = (id: string, x2: number): LabelCandidate => ({ id, text: 'worked together', x: (100 + x2) / 2, y: 200, r: 0, priority: 90, kind: 'link', spots: along(100, 300, x2, 100) });
    const [a, b] = placeLabels([pill('a', 100), pill('b', 180)], measure);
    expect(a && b).toBeTruthy();
    const apart = Math.abs(a!.cx - b!.cx) >= (a!.width + b!.width) / 2 || Math.abs(a!.cy - b!.cy) >= (a!.height + b!.height) / 2;
    expect(apart).toBe(true);
  });
});

describe('relationshipLabel', () => {
  const p = (over: Partial<Person>): Person => ({ id: 'p', name: 'A', ring: 2, primaryTag: 'Work', tags: [], source: 'seed', createdAt: '', ...over });
  it('uses the link name first', () => {
    expect(relationshipLabel({ label: ' roommates ' }, p({}), p({}))).toBe('roommates');
  });
  it('falls back to a shared company, school or tag, then "connected"', () => {
    expect(relationshipLabel({}, p({ company: 'Microsoft' }), p({ company: 'microsoft' }))).toBe('both at Microsoft');
    expect(relationshipLabel({}, p({ school: 'University of Washington' }), p({ school: 'University of Washington' }))).toBe('both UW');
    expect(relationshipLabel({}, p({ tags: ['LinkedIn', 'Clubs'] }), p({ tags: ['Clubs'] }))).toBe('both Clubs');
    expect(relationshipLabel({}, p({ tags: ['LinkedIn'] }), p({ tags: ['LinkedIn'] }))).toBe('connected');
  });
});
