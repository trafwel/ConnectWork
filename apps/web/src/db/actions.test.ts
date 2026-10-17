import { describe, expect, it } from 'vitest';
import { normalizeLink } from './actions';

describe('normalizeLink', () => {
  it('stores each pair once, smaller id first', () => {
    expect(normalizeLink('p_b', 'p_a')).toEqual(['p_a', 'p_b']);
    expect(normalizeLink('p_a', 'p_b')).toEqual(normalizeLink('p_b', 'p_a'));
  });
});
