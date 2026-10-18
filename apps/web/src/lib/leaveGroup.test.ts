import { describe, expect, it } from 'vitest';
import { leaveDestination } from './leaveGroup';

describe('leaveDestination (Oct 18: leaving a group from the card)', () => {
  const groups = ['Work', 'School', 'Friends', 'Hackathon'];
  it('goes back to the previous group when it still exists', () => {
    expect(leaveDestination({ primaryTag: 'Hackathon', previousTag: 'School' }, groups)).toBe('School');
  });
  it('falls back to Work (has a company) or Friends', () => {
    expect(leaveDestination({ primaryTag: 'Hackathon', previousTag: 'Deleted group', company: 'Zillow' }, groups)).toBe('Work');
    expect(leaveDestination({ primaryTag: 'Hackathon' }, groups)).toBe('Friends');
    expect(leaveDestination({ primaryTag: 'Hackathon', previousTag: 'Hackathon' }, groups)).toBe('Friends');
  });
});
