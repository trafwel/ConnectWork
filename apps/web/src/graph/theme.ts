/**
 * T — Map theme tokens · Owner: Person A · ~45 min (whole theme step)
 *
 * WHAT THIS ACHIEVES
 *   Design is 20% of judging. This file collects every color and stroke the
 *   map uses (rings, links, nodes, highlight, selection, flags, the "You"
 *   node) in one object, so applying the theme we pick from the canvas
 *   (Daylight, Night Sky, Atlas or Campus) means editing one file plus the CSS
 *   variables in index.css — not hunting hex codes across components.
 *
 * HOW IT FITS
 *   RingMap.tsx, PersonNode.tsx and LinkLine.tsx import `mapTheme` instead of
 *   hard-coded values. Tag colors stay in lib/colors.ts (DEFAULT_TAGS).
 *   App chrome (buttons, panels, text) is themed by shadcn's CSS variables in
 *   src/index.css (--background, --foreground, --primary, --border, --radius…).
 *
 * STEPS
 *   1. Pick the direction together (canvas "Connectwork theme directions").
 *   2. Fill `mapTheme` with that mockup's values. DONE: Atlas (Oct 17).
 *   3. Replace hard-coded colors in RingMap/PersonNode/LinkLine with mapTheme.*.
 *   4. Fonts: Google Fonts <link> in index.html; --font-sans (and a display
 *      font if the theme has one) in index.css.
 *   5. CSS variables in index.css to the mockup's palette. Night Sky: add
 *      class="dark" on <html> and set the .dark block instead.
 *   6. Tag colors in lib/colors.ts. Keep them colorblind-distinguishable and
 *      check 4.5:1 contrast where initials sit on a node (use dark initials on
 *      light fills: add an `on` color per tag if needed).
 *   7. Existing browsers keep old tag colors in IndexedDB: on startup, bulkPut
 *      DEFAULT_TAGS for the default tag names only (don't touch custom tags).
 *
 * DONE WHEN
 *   - A screenshot of the app sits comfortably next to the chosen mockup;
 *     focus rings are still visible; text contrast passes.
 *
 * Guide: §14
 */

/** Atlas: map paper, ink lines, contour rings, one teal accent. */
export const mapTheme = {
  paper: '#edf0eb',
  ink: '#1d2a24',
  /** The three ring boundaries. */
  ringStroke: '#7f8c84',
  ringWidth: 1.2,
  /** Faint contour lines between rings, every `contourStep` px. */
  contourStroke: '#d3dad4',
  contourStep: 14,
  /** Dotted crosshair through "You". */
  axisStroke: '#c9d2cb',
  ringLabel: '#56635b',
  link: '#1d2a24',
  linkOpacity: 0.4,
  linkWidth: 0.9,
  suggestedLink: '#0f5f58',
  suggestedDash: '8 4 2 4',
  /** Outlined nodes: a thin ink rim instead of a white halo. */
  nodeStroke: '#1d2a24',
  nodeStrokeWidth: 1,
  selected: '#1d2a24',
  highlight: '#0f5f58',
  highlightDash: '4 3',
  youFill: '#ffffff',
  youStroke: '#1d2a24',
  label: '#1d2a24',
  labelHalo: '#edf0eb',
  overdue: '#b4441a',
  mono: "'IBM Plex Mono', ui-monospace, monospace",
} as const;
