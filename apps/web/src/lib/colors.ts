/**
 * M1 — Tags and colors · done (restyled in step T)
 *
 * WHAT THIS ACHIEVES
 *   Default tags with colors from the Okabe-Ito palette, which stays
 *   distinguishable for the common types of color blindness. Two tags also carry
 *   behavior: follow-up (auto-reminder, M3) and intro (weekly review, M8).
 *
 * HOW IT FITS
 *   Seeded into db.tags; the map, legend, person card and filters look colors up
 *   with tagColor(). PRIMARY_TAGS are the tags that can define a person's color.
 *
 * Guide: §5.4, §14
 */
import type { Tag } from '@connectwork/shared';

// Okabe-Ito: distinguishable for the common forms of color blindness.
export const DEFAULT_TAGS: Tag[] = [
  { name: 'Work', color: '#0072B2', behavior: 'none' },
  { name: 'School', color: '#E69F00', behavior: 'none' },
  { name: 'Friends', color: '#009E73', behavior: 'none' },
  { name: 'Family', color: '#CC79A7', behavior: 'none' },
  { name: 'Clubs', color: '#56B4E9', behavior: 'none' },
  { name: 'LinkedIn', color: '#8C8C8C', behavior: 'none' },
  { name: 'follow-up', color: '#D55E00', behavior: 'follow-up' },
  { name: 'intro', color: '#F0E442', behavior: 'intro' },
];

/** Tags a person can have as their primary (color-defining) tag. */
export const PRIMARY_TAGS = ['Work', 'School', 'Friends', 'Family', 'Clubs', 'LinkedIn'];

export const FALLBACK_COLOR = '#8C8C8C';

export function tagColor(tags: Tag[] | undefined, name: string): string {
  return tags?.find((t) => t.name === name)?.color ?? FALLBACK_COLOR;
}
