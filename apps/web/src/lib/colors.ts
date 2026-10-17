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

// Atlas theme: earthy, darker versions of the Okabe-Ito hues (blue, orange,
// bluish green, reddish purple, sky blue, gray). Keeping Okabe-Ito's hue
// structure keeps groups distinguishable for the common kinds of color
// blindness; Work and Clubs (both blue) also differ clearly in lightness.
export const DEFAULT_TAGS: Tag[] = [
  { name: 'Work', color: '#2F5D8A', behavior: 'none' },
  { name: 'School', color: '#94600F', behavior: 'none' },
  { name: 'Friends', color: '#2E7D5B', behavior: 'none' },
  { name: 'Family', color: '#8E4570', behavior: 'none' },
  { name: 'Clubs', color: '#4A9BC7', behavior: 'none' },
  { name: 'LinkedIn', color: '#9AA39C', behavior: 'none' },
  { name: 'follow-up', color: '#B4441A', behavior: 'follow-up' },
  { name: 'intro', color: '#B08A1E', behavior: 'intro' },
];

/** Tags a person can have as their primary (color-defining) tag. */
export const PRIMARY_TAGS = ['Work', 'School', 'Friends', 'Family', 'Clubs', 'LinkedIn'];

export const FALLBACK_COLOR = '#7D8780';

export function tagColor(tags: Tag[] | undefined, name: string): string {
  return tags?.find((t) => t.name === name)?.color ?? FALLBACK_COLOR;
}

const INK = '#1D2A24';

function luminance(hex: string): number {
  const n = hex.replace('#', '');
  const full = n.length === 3 ? [...n].map((c) => c + c).join('') : n;
  const [r, g, b] = [0, 2, 4].map((i) => {
    const c = parseInt(full.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
}

export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi! + 0.05) / (lo! + 0.05);
}

/** Text color for initials on a tag-colored node: white when it reads at 4.5:1, else ink. */
export function readableOn(fill: string): string {
  return contrastRatio(fill, '#FFFFFF') >= 4.5 ? '#FFFFFF' : INK;
}
