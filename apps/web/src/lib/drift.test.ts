import { describe, expect, it } from 'vitest';
import type { Person } from '@connectwork/shared';
import { driftLevel } from './drift';

const now = new Date(2026, 9, 17);
const p = (ring: 1 | 2 | 3, lastContact?: string): Person => ({ id: 'p', name: 'A', ring, primaryTag: 'Work', tags: [], source: 'seed', createdAt: '', lastContact });

describe('driftLevel', () => {
  it('is 0 without a last contact, at the threshold, and always for ring 3', () => {
    expect(driftLevel(p(1), now)).toBe(0);
    expect(driftLevel(p(1, '2026-07-19'), now)).toBe(0); // exactly 90 days
    expect(driftLevel(p(3, '2020-01-01'), now)).toBe(0);
  });
  it('grows past the threshold and caps at 1 (twice the threshold)', () => {
    expect(driftLevel(p(1, '2026-06-04'), now)).toBeCloseTo(0.5); // 135 days = 1.5×
    expect(driftLevel(p(2, '2025-10-17'), now)).toBe(1); // 365 days > 2×180
    expect(driftLevel(p(2, '2026-03-21'), now)).toBeGreaterThan(0); // John, 210 days
  });
});
