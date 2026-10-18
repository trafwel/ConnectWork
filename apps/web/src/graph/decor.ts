/**
 * Styles (Oct 18): the shapes behind the map for the two themed styles
 *
 * WHAT THIS ACHIEVES
 *   Spiderweb (Halloween) draws the three rings as a spider's web: straight spokes from
 *   "You" and threads that sag between them. Phantom (red-and-black comic style) draws them
 *   as jagged starbursts. Only pure geometry lives here (SVG path strings), so it is tested
 *   without a browser; graph/MapDecor.tsx draws them.
 *
 * WHY PATHS AND NOT CIRCLES
 *   A circle can only be a circle. A web thread is a chain of curves between spokes, and a
 *   starburst is a zig-zag polygon, so both are one <path> each: cheap to draw, one DOM node.
 */

/** Spoke directions in radians. Slightly irregular (fixed, not random) so the web looks spun, not drafted. */
export function spokeAngles(count: number): number[] {
  const jitter = [0, 0.05, -0.04, 0.03, -0.06, 0.04, -0.02, 0.06, -0.05, 0.02, -0.03, 0.05];
  return Array.from({ length: count }, (_, i) => (i / count) * Math.PI * 2 - Math.PI / 2 + (jitter[i % jitter.length] ?? 0) * (Math.PI / count));
}

/**
 * One closed web thread at radius `r`: a point on every spoke, joined by curves that sag
 * toward the center (a real thread hangs slack between two spokes). `sag` 0 = straight
 * segments, 0.15 = the middle of each span sits 15% closer to the center.
 */
export function webThreadPath(cx: number, cy: number, r: number, angles: number[], sag = 0.12): string {
  if (angles.length < 3 || r <= 0) return '';
  const pt = (a: number, rr: number) => `${round(cx + rr * Math.cos(a))} ${round(cy + rr * Math.sin(a))}`;
  let d = `M${pt(angles[0]!, r)}`;
  for (let i = 0; i < angles.length; i++) {
    const a = angles[i]!;
    const b = i + 1 < angles.length ? angles[i + 1]! : angles[0]! + Math.PI * 2;
    // The control point sits on the bisector, pulled inward: the curve dips between the spokes.
    d += ` Q${pt((a + b) / 2, r * (1 - sag))} ${pt(b, r)}`;
  }
  return `${d}Z`;
}

/** Spokes from just outside "You" to `outer`, as one path of separate line segments. */
export function spokesPath(cx: number, cy: number, inner: number, outer: number, angles: number[]): string {
  return angles
    .map((a) => `M${round(cx + inner * Math.cos(a))} ${round(cy + inner * Math.sin(a))}L${round(cx + outer * Math.cos(a))} ${round(cy + outer * Math.sin(a))}`)
    .join('');
}

/**
 * A starburst (comic "impact" shape) around radius `r`: `points` spikes, each reaching
 * `spike` × r beyond the base circle and dipping the same amount inside. `turn` rotates it.
 */
export function burstPath(cx: number, cy: number, r: number, points: number, spike = 0.06, turn = 0): string {
  if (points < 3 || r <= 0) return '';
  const parts: string[] = [];
  for (let i = 0; i < points * 2; i++) {
    const a = turn + (i / (points * 2)) * Math.PI * 2;
    const rr = r * (i % 2 === 0 ? 1 + spike : 1 - spike);
    parts.push(`${i === 0 ? 'M' : 'L'}${round(cx + rr * Math.cos(a))} ${round(cy + rr * Math.sin(a))}`);
  }
  return `${parts.join('')}Z`;
}

/** Eight bent legs around the center, so "You" is the spider in the middle of the web. */
export function spiderLegsPath(cx: number, cy: number, body: number): string {
  // Right side, top to bottom (degrees from 3 o'clock, y grows downward); the left side mirrors it.
  const right = [-55, -22, 12, 45];
  const legs: string[] = [];
  for (const side of [1, -1]) {
    for (const deg of right) {
      const a = (deg * Math.PI) / 180;
      const dir = side === 1 ? a : Math.PI - a;
      const lift = deg < 0 ? -1 : 1; // upper legs bend up, lower legs bend down
      const at = (rr: number, da: number) => `${round(cx + rr * Math.cos(dir + da * side * lift))} ${round(cy + rr * Math.sin(dir + da * side * lift))}`;
      legs.push(`M${at(body * 0.8, 0)}L${at(body * 1.65, -0.18)}L${at(body * 2.15, 0.22)}`);
    }
  }
  return legs.join('');
}

const round = (n: number) => Math.round(n * 10) / 10;
