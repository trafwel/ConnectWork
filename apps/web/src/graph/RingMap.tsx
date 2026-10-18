/**
 * M2 — Ring map (SVG) · done (step T restyles it)
 *
 * WHAT THIS ACHIEVES
 *   The heart of the product: your network as rings around you. Pan and zoom,
 *   click a person to open their card (and bring them to the center), see who an AI
 *   answer is about, and filter without anyone moving.
 *
 * HOW IT FITS
 *   App passes people, links, tags and filterContext. Selection, highlights and the
 *   filter come from the store. Layout from layout.ts; nodes and links are drawn by
 *   PersonNode and LinkLine; colors from graph/theme.ts (step T).
 *
 * STEPS
 *   1. Measure the container: a useSize hook with a ref, reading getBoundingClientRect()
 *      ON MOUNT and then a ResizeObserver. (The observer alone reports nothing in a
 *      background tab — the map would stay 0×0.)
 *   2. const layout = useForceLayout(people, links, width, height, offsetFor); positions = layout.positions.
 *   3. Pan/zoom: in a mount-only useEffect, d3zoom<SVGSVGElement, unknown>().scaleExtent([0.5, 3])
 *      .on('zoom', e => setTransform(e.transform)); select(svg).call(behavior).on('dblclick.zoom', null);
 *      keep the behavior in a ref. Apply transform.toString() to an inner <g>.
 *      Show a "Reset view" button when the transform isn't identity:
 *        select(svg).call(zoomRef.current.transform, zoomIdentity)
 *   4. Layers, back to front: three dashed ring circles; links (LinkLine); the "You" node
 *      at the center; people sorted ring 3 → 1 (closer people draw on top); ring labels
 *      ("Close", "Regular", "Wider") drawn LAST with a halo (stroke = background color,
 *      paintOrder="stroke") so nodes never cover them.
 *   5. Ring label placement: for each ring, test angles every 5° and pick the one farthest
 *      from that ring's people (Math.atan2 of their positions), nudged toward LABEL_ANGLE.
 *   6. Dimming: if anything is highlighted, dim everyone else (opacity 0.15); otherwise dim
 *      people outside the filter (matchesFilter from lib/filters.ts). Nobody is removed,
 *      so nothing jumps.
 *   7. Click empty space → clearFocus(); click a node → selectPerson(id) (stopPropagation in the node).
 *   8. FOCUS ON CLICK:
 *      a. neighborIds = people linked to the selected person (pass `neighbor` to PersonNode
 *         so their names show).
 *      b. LinkLine emphasis: 'focus' for links touching the selected person, 'faint' for all
 *         others while someone is selected, 'normal' otherwise.
 *      c. Center the selected person: in an effect on [selectedId, positions, layout.width,
 *         layout.height, width, height]: return until layout.width/height === width/height
 *         (opening the card narrows the map and the layout recomputes — centering on the OLD
 *         positions was a real bug), then once per `${selectedId}|${width}x${height}` pan to
 *           x = width/2 − k·pos.x, y = height/2 − k·pos.y (keep the current zoom k)
 *         with a 450 ms ease-out requestAnimationFrame tween calling zoom.transform each frame;
 *         jump instantly if prefers-reduced-motion is set or document.hidden.
 *   9. Legend in the bottom-left corner: one dot + name per tag with behavior 'none'.
 *  10. Accessibility: <svg role="group" aria-label="Network map. People closer to the center
 *      are closer to you.">; decorative layers aria-hidden.
 *
 * DONE WHEN
 *   - Zoom, pan, reset view, click-to-open and keyboard selection work; clicking a person
 *     centers them (also after the card opens) and only their links stay strong.
 *
 * Guide: §6.2
 */
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { select } from 'd3-selection';
import { zoom as d3zoom, zoomIdentity, zoomTransform, type ZoomBehavior, type ZoomTransform } from 'd3-zoom';
import { Maximize } from 'lucide-react';
import type { Link, Person, Ring, Tag } from '@connectwork/shared';
import { Button } from '@/components/ui/button';
import { safeColor, tagColor } from '@/lib/colors';
import { matchesFilter, type FilterContext } from '@/lib/filters';
import { useStore } from '@/store/useStore';
import { geometry, LABEL_ANGLE, ringRadius, useForceLayout } from './layout';
import { LinkLine } from './LinkLine';
import { PersonNode } from './PersonNode';
import { mapTheme as T } from './theme';

const RINGS: Ring[] = [1, 2, 3];
const RING_LABELS: Record<Ring, string> = { 1: 'Close', 2: 'Regular', 3: 'Wider' };

interface Props {
  people: Person[];
  links: Link[];
  tags: Tag[];
  filterContext: FilterContext;
  offsetFor?: (p: Person) => number;
}

/** Step 1. Measure on mount, then follow resizes (the observer alone is silent in background tabs). */
function useSize<E extends HTMLElement>() {
  const ref = useRef<E>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setSize({ width: Math.round(rect.width), height: Math.round(rect.height) });
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry!.contentRect;
      setSize({ width: Math.round(width), height: Math.round(height) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, size] as const;
}

/** Labels only change at zoom 1.3 and 2.2, so nodes get a snapped value and skip re-rendering mid-zoom. */
const labelZoom = (k: number) => (k >= 2.2 ? 2.2 : k >= 1.3 ? 1.3 : 1);

export function RingMap({ people, links, tags, filterContext, offsetFor }: Props) {
  const [containerRef, { width, height }] = useSize<HTMLDivElement>();
  const svgRef = useRef<SVGSVGElement>(null);
  const zoomRef = useRef<ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const [transform, setTransform] = useState<ZoomTransform>(zoomIdentity);

  const selectedId = useStore((s) => s.selectedPersonId);
  const highlightIds = useStore((s) => s.highlightIds);
  const filter = useStore((s) => s.filter);
  const selectPerson = useStore((s) => s.selectPerson);
  const clearFocus = useStore((s) => s.clearFocus);

  // Step 2.
  const layout = useForceLayout(people, links, width, height, offsetFor);
  const positions = layout.positions;
  const g = geometry(width, height);

  // Step 3. d3 only computes the transform; React draws everything.
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const behavior = d3zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.5, 3])
      .on('zoom', (e: { transform: ZoomTransform }) => setTransform(e.transform));
    select(svg).call(behavior).on('dblclick.zoom', null);
    zoomRef.current = behavior;
    return () => {
      select(svg).on('.zoom', null);
    };
  }, []);
  const resetView = () => {
    if (svgRef.current && zoomRef.current) select(svgRef.current).call(zoomRef.current.transform, zoomIdentity);
  };

  // Step 5. Each ring's label goes where that ring has the most empty space, nudged to the upper left.
  const labelAngles = useMemo(() => {
    const out: Record<Ring, number> = { 1: LABEL_ANGLE, 2: LABEL_ANGLE, 3: LABEL_ANGLE };
    for (const ring of RINGS) {
      const angles: number[] = [];
      for (const p of people) {
        const pos = p.ring === ring ? positions.get(p.id) : undefined;
        if (pos) angles.push(Math.atan2(pos.y - g.cy, pos.x - g.cx));
      }
      if (!angles.length) continue;
      let bestScore = -Infinity;
      for (let deg = -180; deg < 180; deg += 5) {
        const a = (deg * Math.PI) / 180;
        const gap = Math.min(...angles.map((b) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)))));
        const score = gap - Math.abs(a - LABEL_ANGLE) * 0.02;
        if (score > bestScore) {
          bestScore = score;
          out[ring] = a;
        }
      }
    }
    return out;
  }, [people, positions, g.cx, g.cy]);

  // Step 6. Highlights win over the filter. Dim, never remove, so nobody moves.
  const dimmedIds = useMemo(() => {
    const hasHighlights = highlightIds.size > 0;
    const out = new Set<string>();
    for (const p of people) {
      const dim = hasHighlights ? !highlightIds.has(p.id) : !matchesFilter(p, filter, filterContext);
      if (dim) out.add(p.id);
    }
    return out;
  }, [people, highlightIds, filter, filterContext]);

  // Step 8a. People directly linked to the selected person.
  const neighborIds = useMemo(() => {
    const out = new Set<string>();
    if (!selectedId) return out;
    for (const l of links) {
      if (l.fromId === selectedId) out.add(l.toId);
      else if (l.toId === selectedId) out.add(l.fromId);
    }
    return out;
  }, [links, selectedId]);

  // Ring 3 first so closer people draw on top. Sorted once per data change, not per zoom frame.
  const drawOrder = useMemo(() => [...people].sort((a, b) => b.ring - a.ring), [people]);

  // Step 8c. Center the selected person once per selection and map size, but only on a layout
  // computed for THIS size (opening the card narrows the map and the layout recomputes).
  const centeredFor = useRef<string | null>(null);
  useEffect(() => {
    if (!selectedId) {
      centeredFor.current = null;
      return;
    }
    if (layout.width !== width || layout.height !== height) return;
    const key = `${selectedId}|${width}x${height}`;
    const pos = positions.get(selectedId);
    if (!pos || !svgRef.current || !zoomRef.current || centeredFor.current === key) return;
    centeredFor.current = key;
    panTo(svgRef.current, zoomRef.current, pos, width, height);
  }, [selectedId, positions, layout.width, layout.height, width, height]);

  const k = labelZoom(transform.k);
  const zoomed = transform.k !== 1 || transform.x !== 0 || transform.y !== 0;

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full overflow-hidden"
      onKeyDown={(e) => {
        if (e.key === 'Escape' && selectedId) clearFocus();
      }}
    >
      <svg
        ref={svgRef}
        width={width}
        height={height}
        className="block select-none"
        role="group"
        aria-label="Network map. People closer to the center are closer to you."
        onClick={() => clearFocus()} // step 7: nodes stop propagation, so this is empty space
      >
        <g transform={transform.toString()}>
          {/* Step 4, back to front: rings, links, You, people, ring labels */}
          <g aria-hidden="true">
            {RINGS.map((ring) => (
              <circle
                key={ring}
                cx={g.cx}
                cy={g.cy}
                r={ringRadius(g, ring)}
                fill="none"
                stroke={T.ringStroke}
                strokeWidth={T.ringWidth}
                strokeDasharray={T.ringDash}
              />
            ))}
          </g>

          <g aria-hidden="true">
            {links.map((l) => {
              const a = positions.get(l.fromId);
              const b = positions.get(l.toId);
              if (!a || !b) return null;
              const emphasis = !selectedId ? 'normal' : l.fromId === selectedId || l.toId === selectedId ? 'focus' : 'faint';
              return (
                <LinkLine
                  key={l.id}
                  link={l}
                  from={a}
                  to={b}
                  dimmed={dimmedIds.has(l.fromId) || dimmedIds.has(l.toId)}
                  emphasis={emphasis}
                />
              );
            })}
          </g>

          <g aria-hidden="true">
            <circle cx={g.cx} cy={g.cy} r={18} fill={T.youFill} />
            <text x={g.cx} y={g.cy} dy="0.35em" textAnchor="middle" fontSize={11} fontWeight={600} fill={T.paper}>
              You
            </text>
          </g>

          {drawOrder.map((p) => {
            const pos = positions.get(p.id);
            if (!pos) return null;
            return (
              <PersonNode
                key={p.id}
                person={p}
                x={pos.x}
                y={pos.y}
                color={tagColor(tags, p.primaryTag)}
                zoom={k}
                selected={selectedId === p.id}
                highlighted={highlightIds.has(p.id)}
                dimmed={dimmedIds.has(p.id)}
                neighbor={neighborIds.has(p.id)}
                onSelect={selectPerson}
              />
            );
          })}

          <g aria-hidden="true" pointerEvents="none">
            {RINGS.map((ring) => {
              const a = labelAngles[ring];
              const r = ringRadius(g, ring);
              return (
                <text
                  key={ring}
                  x={g.cx + r * Math.cos(a)}
                  y={g.cy + r * Math.sin(a)}
                  dy="0.35em"
                  textAnchor="middle"
                  fontSize={11}
                  fill={T.ringLabel}
                  stroke={T.paper}
                  strokeWidth={5}
                  paintOrder="stroke"
                >
                  {RING_LABELS[ring]}
                </text>
              );
            })}
          </g>
        </g>
      </svg>

      <Legend tags={tags} />
      {zoomed && (
        <Button variant="outline" size="sm" className="absolute right-3 bottom-3" onClick={resetView}>
          <Maximize /> Reset view
        </Button>
      )}
    </div>
  );
}

/** Step 9. Color is never the only signal: the legend names every tag color. */
function Legend({ tags }: { tags: Tag[] }) {
  const shown = tags.filter((t) => t.behavior === 'none');
  return (
    <div className="absolute bottom-3 left-3 rounded-md border bg-background/90 px-3 py-2 text-xs">
      <ul className="grid grid-cols-3 gap-x-4 gap-y-1" aria-label="Tag colors">
        {shown.map((t) => (
          <li key={t.name} className="flex items-center gap-1.5">
            <span className="inline-block size-2.5 rounded-full" style={{ background: safeColor(t.color) }} aria-hidden="true" />
            {t.name}
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Pans (keeping the zoom level) so `pos` sits in the middle. A short requestAnimationFrame
 * tween instead of d3-transition (no extra dependency); jumps straight there when the user
 * prefers reduced motion or the tab is hidden (animation frames are paused there).
 */
function panTo(svg: SVGSVGElement, behavior: ZoomBehavior<SVGSVGElement, unknown>, pos: { x: number; y: number }, width: number, height: number) {
  const from = zoomTransform(svg);
  const k = from.k;
  const to = { x: width / 2 - k * pos.x, y: height / 2 - k * pos.y };
  const apply = (x: number, y: number) => select(svg).call(behavior.transform, zoomIdentity.translate(x, y).scale(k));

  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches || document.hidden) {
    apply(to.x, to.y);
    return;
  }
  const duration = 450;
  const start = performance.now();
  const ease = (t: number) => 1 - (1 - t) ** 3; // ease-out cubic
  const step = (now: number) => {
    const t = Math.min(1, (now - start) / duration);
    const e = ease(t);
    apply(from.x + (to.x - from.x) * e, from.y + (to.y - from.y) * e);
    if (t < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}
