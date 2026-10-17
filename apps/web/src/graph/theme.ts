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
 *   2. Fill `mapTheme` with that mockup's values (the current values below are
 *      the Daylight defaults the app uses today).
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

export const mapTheme = {
  ringStroke: '#cbd5e1',
  ringDash: '2 6',
  ringLabel: '#94a3b8',
  link: '#64748b',
  linkOpacity: 0.35,
  suggestedLink: 'var(--color-primary)',
  nodeStroke: '#ffffff',
  selected: '#0f172a',
  highlight: '#0f172a',
  you: '#0f172a',
  youText: '#ffffff',
  label: '#0f172a',
  labelHalo: '#ffffff',
  overdue: '#D55E00',
  // TODO(T) step 2: replace with the chosen direction's values, then use these in RingMap/PersonNode/LinkLine (step 3).
} as const;
