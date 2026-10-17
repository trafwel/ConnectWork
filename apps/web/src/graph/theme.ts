/**
 * T — Map theme tokens · Owner: Person A · ~45 min (whole theme step)
 *
 * WHAT THIS ACHIEVES
 *   Design is 20% of judging. This file collects every color and stroke the map
 *   uses, so applying our chosen direction (Atlas) means editing one file plus the
 *   CSS variables in index.css — not hunting hex codes across components.
 *
 * HOW IT FITS
 *   RingMap, PersonNode and LinkLine import `mapTheme` instead of hard-coding values.
 *   Tag colors stay in lib/colors.ts; app chrome is themed by CSS variables in index.css.
 *
 * STEPS (Atlas — map paper, ink lines, contour rings, one teal accent)
 *   1. Fill mapTheme with:
 *        paper '#edf0eb'  ink '#1d2a24'
 *        ringStroke '#7f8c84' ringWidth 1.2 (solid ring boundaries)
 *        contourStroke '#d3dad4' contourStep 14 (faint contour circles between rings,
 *          skipping any within contourStep/2 of a ring line)
 *        axisStroke '#c9d2cb' (dotted crosshair through "You", dash "1 5")
 *        ringLabel '#56635b' (mono, 10 px, uppercase "R1 CLOSE", "R2 REGULAR", "R3 WIDER")
 *        link '#1d2a24' linkOpacity 0.4 linkWidth 0.9
 *        suggestedLink '#0f5f58' suggestedDash '8 4 2 4'
 *        nodeStroke '#1d2a24' nodeStrokeWidth 1 (outlined nodes instead of white halos)
 *        selected '#1d2a24' highlight '#0f5f58' highlightDash '4 3'
 *        youFill '#ffffff' youStroke '#1d2a24' (a compass-like circle with a center dot + "YOU")
 *        label '#1d2a24' labelHalo '#edf0eb' overdue '#b4441a'
 *        mono "'IBM Plex Mono', ui-monospace, monospace"
 *   2. Use mapTheme.* in RingMap/PersonNode/LinkLine.
 *   3. Fonts and CSS variables: see the comment at the top of src/index.css and index.html.
 *   4. Tag colors and readable initials: lib/colors.ts steps 4–6; startup color sync:
 *      db/seed.ts step 9.
 *   5. Chrome details: card/panel backgrounds `bg-card`, mono eyebrow labels for section
 *      headings, an ink-bordered answer card with a "FINDING · N PEOPLE" eyebrow.
 *
 * DONE WHEN
 *   - The app sits comfortably next to the Atlas mockup on the theme canvas; focus rings
 *     are visible; text contrast passes.
 *
 * Guide: §14
 */

/**
 * M2 neutral defaults: CSS variables from index.css, so the map follows light/dark mode.
 * (SVG presentation attributes accept var(); checked in Chrome during M2.)
 */
export const mapTheme = {
  // TODO(T) step 1: replace these neutral values with the Atlas tokens above.
  paper: 'var(--background)',
  ink: 'var(--foreground)',
  ringStroke: 'var(--border)',
  ringWidth: 1.5,
  ringDash: '4 6',
  ringLabel: 'var(--muted-foreground)',
  link: 'var(--foreground)',
  linkOpacity: 0.35,
  linkWidth: 1,
  suggestedLink: 'var(--primary)',
  suggestedDash: '5 4',
  nodeStroke: 'var(--background)',
  nodeStrokeWidth: 1.5,
  selected: 'var(--foreground)',
  highlight: 'var(--primary)',
  highlightDash: '4 3',
  youFill: 'var(--foreground)',
  label: 'var(--foreground)',
  labelHalo: 'var(--background)',
  font: 'inherit',
} as const;
