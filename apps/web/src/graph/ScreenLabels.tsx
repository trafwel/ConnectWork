/**
 * Bug fix (Oct 17) — the map's text layer, in screen pixels
 *
 * WHAT THIS ACHIEVES
 *   Names, ring labels ("Close", "Regular", "Wider") and the selected person's relationship
 *   labels, drawn OUTSIDE the zoomed <g>. So text stays readable at any zoom (11 px, growing
 *   gently to 13 px when zoomed in), and placeLabels() keeps any two from overlapping.
 *
 * HOW IT FITS
 *   RingMap calls useScreenLabels() with the zoom transform and the map state, then renders
 *   <ScreenLabels>. A node's screen position is transform.x + k · x (the same math d3-zoom's
 *   transform attribute does for the nodes).
 *
 * WHICH NAMES ARE OFFERED (most important first)
 *   selected > hovered/focused > a relationship label > highlighted > neighbor of the selection
 *   > ring 1 > ring 2 (zoom ≥ 1.3) > ring 3 (zoom ≥ 2.2). Dimmed people get no label.
 *   Zooming in spreads the nodes apart, so more names fit: the text "adapts to zoom" by
 *   showing more of it, not by growing.
 */
import { useEffect, useMemo, useState } from 'react';
import type { ZoomTransform } from 'd3-zoom';
import type { Link, Person, Ring } from '@connectwork/shared';
import { circleBox, placeLabels, relationshipLabel, type Box, type LabelCandidate, type PlacedLabel } from './labels';
import { NODE_RADIUS } from './layout';
import { mapTheme as T } from './theme';

const RING_LABELS: Record<Ring, string> = { 1: 'Close', 2: 'Regular', 3: 'Wider' };
const YOU_RADIUS = 18;
const MAX_LINK_LABEL = 28;

interface Input {
  transform: ZoomTransform;
  /** True while the user (or a pan animation) is zooming: labels must follow at once, not glide. */
  zooming: boolean;
  people: Person[];
  byId: Map<string, Person>;
  links: Link[];
  positions: Map<string, { x: number; y: number }>;
  ringAnchors: Array<{ ring: Ring; a: number; r: number }>;
  center: { x: number; y: number };
  /** Map size in px: a ring label cut off by the edge ("gular") is worse than none. */
  viewport: { width: number; height: number };
  selectedId: string | null;
  hoverId: string | null;
  highlightIds: Set<string>;
  neighborIds: Set<string>;
  dimmedIds: Set<string>;
}

export function useScreenLabels(i: Input) {
  const family = useMapFontFamily();
  const { transform: t } = i;
  const { width: vw, height: vh } = i.viewport;
  // 11 px at zoom ≤ 1, up to 13 px at zoom 3, in half-pixel steps.
  const fontSize = Math.round((11 + Math.min(2, Math.max(0, t.k - 1))) * 2) / 2;

  const placed = useMemo(() => {
    const sx = (x: number) => t.x + t.k * x;
    const sy = (y: number) => t.y + t.k * y;
    const candidates: LabelCandidate[] = [];
    const obstacles: Box[] = [circleBox(sx(i.center.x), sy(i.center.y), YOU_RADIUS * t.k)];
    const force = new Set<string>();

    for (const { ring, a, r } of i.ringAnchors) {
      const id = `ring:${ring}`;
      force.add(id);
      candidates.push({ id, text: RING_LABELS[ring], x: sx(i.center.x + r * Math.cos(a)), y: sy(i.center.y + r * Math.sin(a)), r: 0, priority: 1000, kind: 'ring' });
    }

    for (const p of i.people) {
      const pos = i.positions.get(p.id);
      if (!pos) continue;
      const selected = p.id === i.selectedId;
      const hovered = p.id === i.hoverId;
      // Selection and highlight rings sit at r + 4–5 (map units), so their names start outside them.
      const r = (NODE_RADIUS[p.ring] + (selected || i.highlightIds.has(p.id) ? 6 : 0)) * t.k;
      const x = sx(pos.x);
      const y = sy(pos.y);
      const dimmed = i.dimmedIds.has(p.id);
      if (!dimmed) obstacles.push(circleBox(x, y, r));
      if (dimmed && !selected && !hovered) continue;
      const priority = selected
        ? 100
        : hovered
          ? 95
          : i.highlightIds.has(p.id)
            ? 80
            : i.neighborIds.has(p.id)
              ? 70
              : p.ring === 1
                ? 50
                : p.ring === 2 && t.k >= 1.3
                  ? 30
                  : p.ring === 3 && t.k >= 2.2
                    ? 10
                    : 0;
      if (!priority) continue;
      if (selected || hovered) force.add(p.id);
      candidates.push({ id: p.id, text: p.name, x, y, r, priority, kind: 'name', bold: p.ring === 1 || selected });
    }

    // Relationship labels only for the selected person's lines: everyone else's are faint.
    if (i.selectedId) {
      for (const l of i.links) {
        if (l.fromId !== i.selectedId && l.toId !== i.selectedId) continue;
        const a = i.positions.get(l.fromId);
        const b = i.positions.get(l.toId);
        const pa = i.byId.get(l.fromId);
        const pb = i.byId.get(l.toId);
        if (!a || !b || !pa || !pb) continue;
        const text = relationshipLabel(l, pa, pb);
        candidates.push({
          id: `link:${l.id}`,
          text: text.length > MAX_LINK_LABEL ? `${text.slice(0, MAX_LINK_LABEL - 1)}…` : text,
          x: sx((a.x + b.x) / 2),
          y: sy((a.y + b.y) / 2),
          r: 0,
          priority: 90,
          kind: 'link',
        });
      }
    }

    const measure = (c: LabelCandidate) => textWidth(c.text, `${c.bold ? 600 : 500} ${c.kind === 'link' ? fontSize - 1 : fontSize}px ${family}`) + (c.kind === 'link' ? 12 : 0);
    const inView = (l: PlacedLabel) =>
      l.kind !== 'ring' || (l.cx - l.width / 2 >= 0 && l.cx + l.width / 2 <= vw && l.cy - l.height / 2 >= 0 && l.cy + l.height / 2 <= vh);
    return placeLabels(candidates, measure, { height: fontSize + 3, force, obstacles }).filter(inView);
  }, [t, i.people, i.byId, i.links, i.positions, i.ringAnchors, i.center, vw, vh, i.selectedId, i.hoverId, i.highlightIds, i.neighborIds, i.dimmedIds, family, fontSize]);

  return { placed, fontSize, animate: !i.zooming };
}

/**
 * Keyed by id so React keeps each element and a CSS transition can glide it when the layout
 * moves (450 ms, the same as the nodes). While zooming the transition is off, or text would lag.
 */
export function ScreenLabels({ labels, fontSize, animate }: { labels: PlacedLabel[]; fontSize: number; animate: boolean }) {
  return (
    <g aria-hidden="true" pointerEvents="none" fontFamily={T.font}>
      {labels.map((l) => (
        <g key={l.id} style={{ transform: `translate(${l.cx}px, ${l.cy}px)`, transition: animate ? 'transform 450ms ease-out' : 'none' }}>
          {l.kind === 'link' && (
            <rect x={-l.width / 2} y={-l.height / 2} width={l.width} height={l.height} rx={l.height / 2} fill={T.paper} stroke={T.link} strokeWidth={1} />
          )}
          <text
            dy="0.35em"
            textAnchor="middle"
            fontSize={l.kind === 'link' ? fontSize - 1 : fontSize}
            fontWeight={l.kind === 'ring' ? 400 : l.bold ? 600 : 500}
            fill={l.kind === 'ring' ? T.ringLabel : T.label}
            stroke={l.kind === 'link' ? undefined : T.labelHalo}
            strokeWidth={l.kind === 'ring' ? 5 : 4}
            paintOrder="stroke"
          >
            {l.text}
          </text>
        </g>
      ))}
    </g>
  );
}

let ctx: CanvasRenderingContext2D | null | undefined;
const widths = new Map<string, number>();

/** Text width via canvas measureText (no layout, no DOM), cached per font + text. */
function textWidth(text: string, font: string): number {
  const key = `${font}|${text}`;
  const hit = widths.get(key);
  if (hit !== undefined) return hit;
  if (ctx === undefined) ctx = typeof document === 'undefined' ? null : document.createElement('canvas').getContext('2d');
  let w: number;
  if (ctx) {
    ctx.font = font;
    w = ctx.measureText(text).width;
  } else {
    w = text.length * 0.6 * parseFloat(font.split(' ')[1] ?? '11'); // tests / no canvas: a fair guess
  }
  if (widths.size > 5000) widths.clear();
  widths.set(key, w);
  return w;
}

/** The map font (Atlas uses a mono font), re-read when the appearance changes. */
function useMapFontFamily() {
  const [family, setFamily] = useState(readFamily);
  useEffect(() => {
    const mo = new MutationObserver(() => setFamily(readFamily()));
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-style', 'class'] });
    return () => mo.disconnect();
  }, []);
  return family;
}

function readFamily(): string {
  if (typeof document === 'undefined') return 'sans-serif';
  const v = getComputedStyle(document.documentElement).getPropertyValue('--map-font').trim();
  return v && v !== 'inherit' ? v : getComputedStyle(document.body).fontFamily || 'sans-serif';
}
