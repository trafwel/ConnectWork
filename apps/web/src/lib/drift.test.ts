import { describe, expect, it } from 'vitest';
import type { Person } from '@connectwork/shared';
import { DEFAULT_THRESHOLDS, driftLevel, driftStep, isConnectDateOnly, parseThresholds } from './drift';

const now = new Date(2026, 9, 17);
const p = (ring: 1 | 2 | 3, lastContact?: string, over: Partial<Person> = {}): Person => ({ id: 'p', name: 'A', ring, primaryTag: 'Work', tags: [], source: 'seed', createdAt: '', lastContact, ...over });

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

describe('custom thresholds (Settings)', () => {
  it('uses the given limits', () => {
    const strict = { 1: 30, 2: 60, 3: Infinity };
    expect(driftLevel(p(1, '2026-08-18'), now, strict)).toBe(1); // 60 days = 2× 30
    expect(driftLevel(p(1, '2026-08-18'), now)).toBe(0); // under the default 90
  });

  it('parseThresholds keeps sane whole numbers and falls back per ring', () => {
    expect(parseThresholds({ 1: 30, 2: 120 })).toEqual({ 1: 30, 2: 120, 3: Infinity });
    expect(parseThresholds({ 1: 3, 2: '200' })).toEqual(DEFAULT_THRESHOLDS); // too small; not a number
    expect(parseThresholds({ 1: 45.5, 2: 99999 })).toEqual(DEFAULT_THRESHOLDS); // not whole; too big
    expect(parseThresholds(undefined)).toEqual(DEFAULT_THRESHOLDS);
    expect(parseThresholds('junk')).toEqual(DEFAULT_THRESHOLDS);
  });
});

describe('LinkedIn "connected on" is not contact (M4-O4)', () => {
  const imported = p(2, '2024-01-10', { source: 'linkedin', metAt: '2024-01-10' });
  it('does not drift on the connect date alone', () => {
    expect(isConnectDateOnly(imported)).toBe(true);
    expect(driftLevel(imported, now)).toBe(0);
  });
  it('drifts normally once a real contact is logged, or for other sources', () => {
    expect(driftLevel({ ...imported, lastContact: '2025-01-10' }, now)).toBe(1);
    expect(driftLevel({ ...imported, source: 'manual' }, now)).toBe(1);
  });
});

describe('driftStep', () => {
  it('rounds to twentieths so the layout key stays stable', () => {
    expect(driftStep(0.333)).toBe(0.35);
    expect(driftStep(0)).toBe(0);
    expect(driftStep(1)).toBe(1);
  });
});
