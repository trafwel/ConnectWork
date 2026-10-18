/**
 * Splash (Oct 18, team request) — the opening moment
 *
 * WHAT THIS ACHIEVES
 *   On load, the Connectwork wordmark wipes in, the network icon grows its spokes, and then
 *   the view dives into the centre node until it lands exactly on the map's "You" node, and
 *   the rest of the app fades in around it, outward from you. It doubles as the loading screen:
 *   the dive waits for `ready` (the database is open and seeded), so nobody sees "Loading…".
 *
 * HOW IT WORKS
 *   - The logo follows the team's sketch: the wordmark on the left, set in the app's own font (the
 *     same as the top bar, so the splash hands over to a matching title), and a hexagon of nodes
 *     on the right. The wordmark is revealed by a clip rectangle that grows left to right.
 *   - One requestAnimationFrame clock sets every attribute from the elapsed time. React renders
 *     once; nothing re-renders per frame, and skipping is just moving the clock forward.
 *   - The dive reads where the real "You" circle is on screen and how big, every frame, and
 *     zooms until the logo's centre dot covers it exactly, so the hand-over is seamless.
 *   - The fade-in is an SVG mask: the paper is a full-screen rect with a soft-edged hole (a
 *     radial gradient) centred on you that grows past the corners, so the real app, already
 *     rendered underneath, appears from the middle outward.
 *   - Click or any key skips ahead. prefers-reduced-motion gets the still logo and a short fade.
 */
import { useEffect, useRef, useState } from 'react';

// The icon, where the sketch drew it: a centre node with six around it.
const HUB = { x: 822, y: 122 };
const HEX_R = 50; // centre → outer node
const NODE_R = 12;
const CENTER_R = 9;
const OUTER = Array.from({ length: 6 }, (_, i) => {
  const a = (Math.PI / 3) * i - Math.PI / 2 + Math.PI / 6; // flat sides top and bottom, like the sketch
  return { x: HUB.x + HEX_R * Math.cos(a), y: HUB.y + HEX_R * Math.sin(a), a };
});
const WORD_END = HUB.x - HEX_R - NODE_R - 30; // the wordmark ends just left of the icon
const WORD_SIZE = 112;
const STROKE = 3.2;
const OVERSHOOT = 4; // the dive goes past You's size, then settles onto it as the map appears
const MAP_YOU_R = 18; // RingMap's "You" radius, for when it isn't on screen (List view, empty map)

type Span = readonly [number, number];

// Timeline (ms). The dive starts at HOLD or when the app is ready, whichever is later.
const WRITE: Span = [0, 1000];
const CENTER_POP: Span = [1000, 1250];
const SPOKES: Span = [1150, 1450];
const NODES: Span = [1200, 1650]; // staggered, clockwise
const HOLD = 1800;
const DIVE_MS = 800; // logo → onto "You"
const REVEAL_MS = 800; // the app fades in around you
const GIVE_UP_MS = 6000; // never trap anyone behind the splash, even if `ready` never comes

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const span = (t: number, [a, b]: Span) => clamp01((t - a) / (b - a));
const easeOut = (p: number) => 1 - (1 - p) ** 3;
const easeInOut = (p: number) => (p < 0.5 ? 4 * p ** 3 : 1 - (-2 * p + 2) ** 3 / 2);
/** A small overshoot, so nodes land with a little bounce. */
const pop = (p: number) => (p <= 0 ? 0 : 1 + 2.2 * (p - 1) ** 3 + 1.2 * (p - 1) ** 2);

export function SplashScreen({ ready }: { ready: boolean }) {
  const [done, setDone] = useState(false);
  const readyRef = useRef(ready);
  useEffect(() => {
    readyRef.current = ready; // read by the animation clock, which must not restart when it changes
  }, [ready]);
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const q = <T extends Element>(sel: string) => [...svg.querySelectorAll<T>(sel)];
    const word = svg.querySelector<SVGTextElement>('[data-word]')!;
    const wipe = svg.querySelector<SVGRectElement>('[data-wipe]')!;
    const spokes = q<SVGLineElement>('[data-spoke]');
    const nodes = q<SVGGElement>('[data-node]');
    const camera = svg.querySelector<SVGGElement>('[data-camera]')!;
    const fadeOuts = q<SVGGElement>('[data-fade]');
    const center = svg.querySelector<SVGCircleElement>('[data-center]')!;
    const hole = svg.querySelector<SVGCircleElement>('[data-hole]')!;

    // The logo's box (wordmark + icon), for fitting it to the screen. Measured again once the web
    // font has loaded, because the fallback font has a different width.
    let logo = { x: 0, y: 0, w: 1, h: 1 };
    const measure = () => {
      const b = word.getBBox();
      const left = Math.min(b.x, HUB.x - HEX_R - NODE_R);
      const right = HUB.x + HEX_R + NODE_R;
      const top = Math.min(b.y, HUB.y - HEX_R - NODE_R);
      const bottom = Math.max(b.y + b.height, HUB.y + HEX_R + NODE_R);
      logo = { x: left, y: top, w: right - left, h: bottom - top };
      wipe.setAttribute('x', `${b.x - 4}`);
      wipe.setAttribute('y', `${b.y - 4}`);
      wipe.setAttribute('height', `${b.height + 8}`);
      return b.width + 8;
    };
    let wordWidth = measure();
    void document.fonts?.ready.then(() => (wordWidth = measure()));
    const spokeLen = HEX_R - NODE_R - CENTER_R;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let start = performance.now();
    let diveAt: number | null = null; // clock time the dive began
    let raf = 0;
    let youEl: SVGCircleElement | null = null;
    /** Where the map's "You" node is on screen right now (the map may still be fitting itself). */
    const findYou = () => {
      if (!youEl?.isConnected) {
        youEl = null;
        for (const t of document.querySelectorAll('main svg text')) {
          const c = t.previousElementSibling;
          if (t.textContent === 'You' && c instanceof SVGCircleElement) youEl = c;
        }
      }
      const r = youEl?.getBoundingClientRect();
      if (r && r.width > 0) return { x: r.left + r.width / 2, y: r.top + r.height / 2, r: r.width / 2 };
      const m = document.querySelector('main')?.getBoundingClientRect();
      if (m && m.width > 0) return { x: m.left + m.width / 2, y: m.top + m.height / 2, r: MAP_YOU_R };
      return { x: window.innerWidth / 2, y: window.innerHeight / 2, r: MAP_YOU_R };
    };

    const frame = (now: number) => {
      const W = window.innerWidth;
      const H = window.innerHeight;
      let t = now - start;
      if (reduced) t = Math.max(t, HOLD); // the finished logo, no drawing
      const drawT = Math.min(t, HOLD);

      wipe.setAttribute('width', `${wordWidth * easeOut(span(drawT, WRITE))}`);
      const c = easeOut(span(drawT, SPOKES));
      OUTER.forEach((o, i) => {
        const s = spokes[i];
        if (!s) return;
        const ux = Math.cos(o.a);
        const uy = Math.sin(o.a);
        s.setAttribute('x2', `${HUB.x + ux * (CENTER_R + spokeLen * c)}`);
        s.setAttribute('y2', `${HUB.y + uy * (CENTER_R + spokeLen * c)}`);
        s.style.opacity = c > 0 ? '1' : '0';
      });
      const nodeStep = (NODES[1] - NODES[0] - 200) / 5;
      OUTER.forEach((o, i) => {
        const s = pop(span(drawT, [NODES[0] + i * nodeStep, NODES[0] + i * nodeStep + 200]));
        nodes[i]?.setAttribute('transform', `translate(${o.x} ${o.y}) scale(${s})`);
      });
      const centerScale = pop(span(drawT, CENTER_POP));

      // Fit the logo to the screen: 80% of the width, at most 1.4× the sketch.
      const k = Math.min((0.8 * W) / logo.w, (0.5 * H) / logo.h, 1.4);
      const cx = logo.x + logo.w / 2;
      const cy = logo.y + logo.h / 2;
      const hub0 = { x: W / 2 + k * (HUB.x - cx), y: H / 2 + k * (HUB.y - cy) };

      if (diveAt === null && t >= HOLD && (readyRef.current || t >= GIVE_UP_MS)) diveAt = now;
      const d = diveAt === null ? 0 : now - diveAt;
      const centerR = CENTER_R * centerScale;
      let finished: boolean;

      if (reduced) {
        // No zoom: the whole splash fades away.
        const f = clamp01(d / 300);
        svg.style.opacity = `${1 - f}`;
        camera.setAttribute('transform', `translate(${hub0.x} ${hub0.y}) scale(${k}) translate(${-HUB.x} ${-HUB.y})`);
        center.setAttribute('r', `${centerR}`);
        finished = diveAt !== null && f >= 1;
      } else {
        // 1. Dive: slide the centre node onto "You" and zoom in (exponentially, a steady feeling of
        //    speed) past You's size, so it feels like going into it. The rest of the logo flies past.
        // 2. Settle: as the map appears, ease back until the dot is exactly You's size.
        const you = findYou();
        const e = easeInOut(clamp01(d / DIVE_MS));
        const f = easeOut(clamp01((d - DIVE_MS) / REVEAL_MS));
        const settle = easeInOut(clamp01((d - DIVE_MS) / REVEAL_MS));
        const pos = { x: hub0.x + (you.x - hub0.x) * e, y: hub0.y + (you.y - hub0.y) * e };
        const S = d <= DIVE_MS ? k * ((you.r * OVERSHOOT) / (k * CENTER_R)) ** e : (you.r / CENTER_R) * OVERSHOOT ** (1 - settle);
        camera.setAttribute('transform', `translate(${pos.x} ${pos.y}) scale(${S}) translate(${-HUB.x} ${-HUB.y})`);
        center.setAttribute('r', `${centerR}`);
        for (const g of fadeOuts) g.style.opacity = `${1 - clamp01(e / 0.6)}`;

        // The reveal: a soft-edged hole grows from you past the farthest corner. Once the dot has
        // settled onto the real "You" underneath, it fades without anything visibly changing.
        const reach = Math.hypot(Math.max(you.x, W - you.x), Math.max(you.y, H - you.y));
        hole.setAttribute('cx', `${you.x}`);
        hole.setAttribute('cy', `${you.y}`);
        hole.setAttribute('r', `${f > 0 ? you.r + (reach / 0.55 - you.r) * f : 0}`); // clear inside 55% of r
        center.style.opacity = `${1 - clamp01((settle - 0.9) / 0.1)}`;
        finished = diveAt !== null && d >= DIVE_MS + REVEAL_MS;
      }

      if (finished) {
        setDone(true);
        return;
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    // Skip: jump the clock to the finished logo; the dive still waits for `ready`.
    const skip = () => {
      const t = performance.now() - start;
      if (t < HOLD) start -= HOLD - t;
    };
    window.addEventListener('keydown', skip);
    window.addEventListener('pointerdown', skip);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('keydown', skip);
      window.removeEventListener('pointerdown', skip);
    };
  }, []);

  if (done) return null;
  return (
    <div className="fixed inset-0 z-[100]" role="status" aria-live="polite">
      <span className="sr-only">Loading Connectwork</span>
      <svg ref={svgRef} className="block h-full w-full" aria-hidden="true">
        <defs>
          <clipPath id="cw-splash-wipe" clipPathUnits="userSpaceOnUse">
            <rect data-wipe x="0" y="0" width="0" height="0" />
          </clipPath>
          <radialGradient id="cw-splash-soft">
            <stop offset="0.55" stopColor="black" />
            <stop offset="1" stopColor="white" />
          </radialGradient>
          <mask id="cw-splash-lens" maskUnits="userSpaceOnUse" x="0" y="0" width="100%" height="100%">
            <rect width="100%" height="100%" fill="white" />
            <circle data-hole cx="0" cy="0" r="0" fill="url(#cw-splash-soft)" />
          </mask>
        </defs>
        <rect width="100%" height="100%" fill="var(--background)" mask="url(#cw-splash-lens)" />
        <g data-camera fill="none" stroke="var(--foreground)" strokeWidth={STROKE} strokeLinecap="round" strokeLinejoin="round">
          <g data-fade>
            <text
              data-word
              x={WORD_END}
              y={HUB.y}
              textAnchor="end"
              dominantBaseline="central"
              clipPath="url(#cw-splash-wipe)"
              fill="var(--foreground)"
              stroke="none"
              style={{ font: `600 ${WORD_SIZE}px var(--font-sans)`, letterSpacing: '-0.025em' }}
            >
              ConnectWork
            </text>
            {OUTER.map((o, i) => (
              <line key={i} data-spoke x1={HUB.x + Math.cos(o.a) * CENTER_R} y1={HUB.y + Math.sin(o.a) * CENTER_R} x2={HUB.x} y2={HUB.y} style={{ opacity: 0 }} />
            ))}
            {OUTER.map((_, i) => (
              <g key={i} data-node transform="scale(0)">
                <circle r={NODE_R} />
              </g>
            ))}
          </g>
          {/* "You": the same fill as the map's You node, so landing on it is seamless. */}
          <circle data-center cx={HUB.x} cy={HUB.y} r={0} fill="var(--map-you)" stroke="none" />
        </g>
      </svg>
    </div>
  );
}
