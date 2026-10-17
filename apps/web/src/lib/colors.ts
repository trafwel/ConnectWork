/**
 * M1 — Tags and colors · ~15 min (restyled in theme step T)
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
 *   5. (T) contrastRatio(a, b): WCAG relative luminance of each hex
 *        c = channel/255; c ≤ 0.03928 ? c/12.92 : ((c + 0.055)/1.055)^2.4;
 *        L = 0.2126 R + 0.7152 G + 0.0722 B;  ratio = (Lhi + 0.05) / (Llo + 0.05)
 *   6. (T) readableOn(fill): '#FFFFFF' if contrastRatio(fill, white) ≥ 4.5, else the ink color.
 *
 * DONE WHEN
 *   - lib/colors.test.ts passes (unskip it after step T): every default tag has initials
 *     at ≥ 4.5:1, and the two blue tags differ clearly in lightness.
 *
 * Spec: SPEC.md §7.6 · Guide: §5.4, §14
 */
import type { Tag } from '@connectwork/shared';

export const DEFAULT_TAGS: Tag[] = []; // TODO(M1) step 1
export const PRIMARY_TAGS: string[] = []; // TODO(M1) step 2
export const FALLBACK_COLOR = '#8C8C8C';

export function tagColor(_tags: Tag[] | undefined, _name: string): string {
  // TODO(M1) step 3
  return FALLBACK_COLOR;
}

export function contrastRatio(_a: string, _b: string): number {
  // TODO(T) step 5
  throw new Error('TODO(T): contrastRatio is not implemented yet');
}

export function readableOn(_fill: string): string {
  // TODO(T) step 6
  return '#FFFFFF';
}
