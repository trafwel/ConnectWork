import { describe, expect, it } from 'vitest';
import { isSafePhoto, PersonRow } from './storedRows';

describe('isSafePhoto (Oct 18: profile pictures)', () => {
  it('allows our bundled portraits and small inline images', () => {
    expect(isSafePhoto('/avatars/p_01.jpg')).toBe(true);
    expect(isSafePhoto('data:image/jpeg;base64,/9j/4AAQSkZJRg==')).toBe(true);
  });
  it('refuses outside addresses, other paths and other content types', () => {
    for (const v of ['https://evil.example/pixel.png', '//evil.example/a.jpg', '/avatars/../secret.jpg', '/other/p.jpg', 'data:image/svg+xml;base64,PHN2Zz4=', 'javascript:alert(1)', 42]) {
      expect(isSafePhoto(v)).toBe(false);
    }
  });
  it('drops an unsafe photo from an imported backup row but keeps the person', () => {
    const row = PersonRow.parse({ id: 'p1', name: 'A', ring: 2, primaryTag: 'Work', tags: ['Work'], source: 'seed', createdAt: '', photo: 'https://evil.example/x.png' });
    expect(row.photo).toBeUndefined();
    expect(row.name).toBe('A');
  });
});
