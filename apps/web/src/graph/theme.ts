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
 * Step S (style switching): every value is a CSS variable from index.css, so switching
 * Neutral ↔ Atlas or light ↔ dark restyles the map without re-rendering React.
 * (SVG presentation attributes accept var() for colors, widths, dashes and opacity;
 * checked in Chrome.)
 */
export const mapTheme = {
  // TODO(T) step 1: the Atlas values now live in index.css (:root[data-style="atlas"]);
  // step T can still add contour circles and the crosshair.
  paper: 'var(--map-paper)',
  ink: 'var(--map-ink)',
  ringStroke: 'var(--map-ring)',
  ringWidth: 'var(--map-ring-width)',
  ringDash: 'var(--map-ring-dash)',
  ringLabel: 'var(--map-ring-label)',
  link: 'var(--map-link)',
  linkOpacity: 'var(--map-link-opacity)',
  linkWidth: 'var(--map-link-width)',
  suggestedLink: 'var(--map-suggested)',
  suggestedDash: 'var(--map-suggested-dash)',
  nodeStroke: 'var(--map-node-stroke)',
  nodeStrokeWidth: 'var(--map-node-stroke-width)',
  selected: 'var(--map-ink)',
  highlight: 'var(--map-highlight)',
  highlightDash: '4 3',
  youFill: 'var(--map-you)',
  label: 'var(--map-ink)',
  labelHalo: 'var(--map-paper)',
  font: 'var(--map-font)',
} as const;
