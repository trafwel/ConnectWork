/**
 * Styles (Oct 18): the themed backdrop of the ring map (Spiderweb and Phantom)
 *
 * WHAT THIS ACHIEVES
 *   Spiderweb: the rings become a web (spokes + sagging threads), "You" grows spider legs,
 *   and a small spider hangs off the outer thread. Phantom: the rings become jagged
 *   starbursts, with a red burst behind "You" and a slanted red band across the map.
 *
 * HOW IT FITS
 *   RingMap draws this right behind its rings. Both versions are always in the DOM and CSS
 *   shows the one that matches <html data-style> (index.css, .cw-decor-*). That's the same
 *   trick as the Flag/Ripple reminder styles: switching style re-renders nothing in React.
 *   The plain ring circles are hidden by CSS in these two styles, except the ring a dragged
 *   person would land in (.cw-ring-target), so "Move people" still shows its drop target.
 *
 * ACCESSIBILITY
 *   Pure decoration: aria-hidden, no pointer events, and the ring names ("Close", "Regular",
 *   "Wider") still come from the screen labels. The hanging spider's bob stops for Reduce Motion.
 */
import { memo } from 'react';
import { burstPath, spiderLegsPath, spokeAngles, spokesPath, webThreadPath } from './decor';
import type { Geometry } from './layout';

interface Props {
  g: Geometry;
  /** Ring radii in map units: [ring 1, ring 2, ring 3]. */
  radii: [number, number, number];
}

function MapDecorImpl({ g, radii }: Props) {
  const [r1, r2, r3] = radii;
  const { cx, cy } = g;
  const angles = spokeAngles(12);
  // Main threads on the rings; fainter in-between threads make it read as a web, not a target.
  const minor = [r1 * 0.55, (r1 + r2) / 2, (r2 + r3) / 2, r3 * 1.14];
  const outer = r3 * 1.22;
  // The hanging spider: from the outer thread at about 1 o'clock, a short silk line down.
  const hang = { x: cx + r3 * 0.62, top: cy - r3 * 0.98, y: cy - r3 * 0.72 };

  return (
    <g aria-hidden="true" pointerEvents="none">
      <g className="cw-decor cw-decor-web">
        <path d={spokesPath(cx, cy, 20, outer, angles)} fill="none" stroke="var(--web-silk)" strokeWidth={0.9} opacity="var(--web-minor-opacity)" />
        {minor.map((r) => (
          <path key={r} d={webThreadPath(cx, cy, r, angles, 0.1)} fill="none" stroke="var(--web-silk)" strokeWidth={0.8} opacity="var(--web-minor-opacity)" />
        ))}
        {radii.map((r) => (
          <path key={r} d={webThreadPath(cx, cy, r, angles, 0.12)} fill="none" stroke="var(--web-silk)" strokeWidth={1.4} opacity="var(--web-major-opacity)" />
        ))}
        <path d={spiderLegsPath(cx, cy, 18)} fill="none" stroke="var(--map-you)" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
        <g className="cw-spider">
          <line x1={hang.x} y1={hang.top} x2={hang.x} y2={hang.y} stroke="var(--web-silk)" strokeWidth={0.9} opacity="var(--web-major-opacity)" />
          <path d={spiderLegsPath(hang.x, hang.y + 4, 4)} fill="none" stroke="var(--map-ink)" strokeWidth={1.1} strokeLinecap="round" />
          <circle cx={hang.x} cy={hang.y + 4} r={4} fill="var(--map-ink)" />
          <circle cx={hang.x} cy={hang.y - 1} r={2.4} fill="var(--map-ink)" />
        </g>
      </g>

      <g className="cw-decor cw-decor-phantom">
        <path d={burstPath(cx, cy, r3, 36, 0.035, 0.05)} fill="var(--phantom-burst-fill)" />
        {/* A slanted band across the map: the style's signature slash of red. */}
        <rect x={cx - outer * 1.6} y={cy - r1 * 0.5} width={outer * 3.2} height={r1 * 1} fill="var(--phantom-band)" transform={`rotate(-14 ${cx} ${cy})`} />
        <path d={burstPath(cx, cy, r3, 36, 0.035, 0.05)} fill="none" stroke="var(--map-ink)" strokeWidth={2.5} strokeLinejoin="miter" />
        <path d={burstPath(cx, cy, r2, 28, 0.04, 0.12)} fill="none" stroke="var(--map-ink)" strokeWidth={2} strokeLinejoin="miter" />
        <path d={burstPath(cx, cy, r1, 20, 0.05)} fill="none" stroke="var(--map-ink)" strokeWidth={2} strokeLinejoin="miter" />
        <path d={burstPath(cx, cy, 34, 10, 0.28, 0.2)} fill="var(--primary)" stroke="var(--map-ink)" strokeWidth={2} />
      </g>
    </g>
  );
}

/** Redrawn only when the map is resized. */
export const MapDecor = memo(MapDecorImpl, (a, b) => a.g === b.g && a.radii.every((r, i) => r === b.radii[i]));
