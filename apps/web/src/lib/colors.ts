/**
 * M1 — Tags and colors · done (restyled in theme step T)
 *
 * WHAT THIS ACHIEVES
 *   Default tags with colors that stay distinguishable for the common types of
 *   color blindness, and two tags with behavior: follow-up (auto-reminder, M3) and
 *   intro (weekly review, M8).
 *
 * HOW IT FITS
 *   Seeded into db.tags (db/seed.ts). The map, legend, person card and filters look
 *   colors up with tagColor(). PRIMARY_TAGS are the tags that can define a person's color.
 *
 * STEPS
 *   1. DEFAULT_TAGS (M1, Okabe-Ito palette):
 *        Work #0072B2 · School #E69F00 · Friends #009E73 · Family #CC79A7 · Clubs #56B4E9 ·
 *        LinkedIn #8C8C8C (unsorted imports) — behavior 'none';
 *        follow-up #D55E00 behavior 'follow-up'; intro #F0E442 behavior 'intro'.
 *   2. PRIMARY_TAGS = ['Work', 'School', 'Friends', 'Family', 'Clubs', 'LinkedIn'];
 *      FALLBACK_COLOR for tags the user invents (a neutral gray).
 *   3. tagColor(tags, name) → the tag's color or FALLBACK_COLOR.
 *   4. (Theme step T — Atlas) Darker, earthier versions of the same hues, which stay
 *      colorblind-safe and give readable initials:
 *        Work #2F5D8A · School #94600F · Friends #2E7D5B · Family #8E4570 · Clubs #4A9BC7 ·
 *        LinkedIn #9AA39C · follow-up #B4441A · intro #B08A1E
 *   5. contrastRatio(a, b) (done in the open-issues step): WCAG relative luminance of each hex
 *        c = channel/255; c ≤ 0.03928 ? c/12.92 : ((c + 0.055)/1.055)^2.4;
 *        L = 0.2126 R + 0.7152 G + 0.0722 B;  ratio = (Lhi + 0.05) / (Llo + 0.05)
 *   6. readableOn(fill): white or a near-black ink, whichever has MORE contrast on the fill
 *      (done in the post-M4 open-issues step, M2-O1: the Atlas ink #1D2A24 only reaches
 *      4.46:1 on LinkedIn gray, so "white else ink" was not always enough).
 *
 * DONE WHEN
 *   - lib/colors.test.ts passes (unskip it after step T): every default tag has initials
 *     at ≥ 4.5:1, and the two blue tags differ clearly in lightness.
 *
 * Spec: SPEC.md §7.6 · Guide: §5.4, §14
 */
import type { Tag } from '@connectwork/shared';

// Okabe-Ito: designed to stay distinguishable for the common kinds of color blindness.
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

/** Tags that can be a person's primary (color-defining) tag. */
export const PRIMARY_TAGS = ['Work', 'School', 'Friends', 'Family', 'Clubs', 'LinkedIn'];

/** Color for tags the user invents. */
export const FALLBACK_COLOR = '#8C8C8C';

/**
 * Colors come from IndexedDB, which an imported backup can fill. Only plain hex colors are
 * rendered: a value like "url(https://…)" in a style or fill would make the browser fetch it.
 */
export function safeColor(color: string | undefined): string {
  return color && /^#[0-9a-f]{3,8}$/i.test(color) ? color : FALLBACK_COLOR;
}

export function tagColor(tags: Tag[] | undefined, name: string): string {
  return safeColor(tags?.find((t) => t.name === name)?.color);
}

/** Near-black for initials on light fills. Theme step T may change it; colors.test.ts guards 4.5:1. */
export const INK = '#111111';

/** WCAG relative luminance of a #rgb / #rrggbb color. */
function luminance(hex: string): number {
  let h = hex.replace('#', '');
  if (h.length === 3) h = [...h].map((c) => c + c).join('');
  const [r, g, b] = [0, 2, 4].map((i) => {
    const c = parseInt(h.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
}

/** WCAG contrast ratio, from 1 (same color) to 21 (black on white). Text needs ≥ 4.5. */
export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [luminance(safeColor(a)), luminance(safeColor(b))].sort((x, y) => y - x);
  return (hi! + 0.05) / (lo! + 0.05);
}

/** White or ink, whichever reads better on `fill`. */
export function readableOn(fill: string): string {
  return contrastRatio(fill, '#FFFFFF') >= contrastRatio(fill, INK) ? '#FFFFFF' : INK;
}
