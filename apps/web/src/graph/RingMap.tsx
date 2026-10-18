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
 * BUG FIX (Oct 17) — labels, focus and relationship names
 *   - Names, ring labels and link labels are drawn in a SCREEN-SPACE layer outside the zoom
 *     <g>: their size no longer follows the zoom (only a gentle 11 → 13 px), and placeLabels()
 *     (labels.ts) gives each one a free spot or skips it, so they never overlap.
 *   - Clicking a person grays out everyone except them and the people they're linked to.
 *   - Their lines get a relationship label (the link's name, or what the two have in common).
 *
 * FIX STEP 2 (Oct 17) — "Move people" edit mode
 *   A toggle (bottom right) turns on edit mode: drag a person across the ring lines to move
 *   them (useRingDrag.ts), or focus them and press 1, 2 or 3. The target ring lights up while
 *   dragging; a drop writes through updatePerson with an Undo toast. d3-zoom ignores pointer
 *   presses on people in edit mode (zoom.filter), so dragging a person doesn't pan the map.
 *
 * DONE WHEN
 *   - Zoom, pan, reset view, click-to-open and keyboard selection work; clicking a person
 *     centers them (also after the card opens) and only their links stay strong.
 *
 * Guide: §6.2
 */
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { select } from 'd3-selection';
import { zoom as d3zoom, zoomIdentity, zoomTransform, type ZoomBehavior, type ZoomTransform } from 'd3-zoom';
import { Maximize, Move } from 'lucide-react';
import { toast } from 'sonner';
import type { Link, Person, Ring, Tag } from '@connectwork/shared';
import { Button } from '@/components/ui/button';
import { updatePerson } from '@/db/actions';
import { safeColor, tagColor } from '@/lib/colors';
import { DRIFT_OFFSET, driftStep } from '@/lib/drift';
import { matchesFilter, type FilterContext } from '@/lib/filters';
import { useStore } from '@/store/useStore';
import { geometry, LABEL_ANGLE, ringRadius, useForceLayout } from './layout';
import { LinkLine } from './LinkLine';
import { PersonNode } from './PersonNode';
import { ScreenLabels, useScreenLabels } from './ScreenLabels';
import { useRingDrag } from './useRingDrag';
import { mapTheme as T } from './theme';

const RINGS: Ring[] = [1, 2, 3];
const RING_NAMES: Record<Ring, string> = { 1: 'Close (ring 1)', 2: 'Regular (ring 2)', 3: 'Wider (ring 3)' };

interface Props {
  people: Person[];
  links: Link[];
  tags: Tag[];
  filterContext: FilterContext;
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


export function RingMap({ people, links, tags, filterContext }: Props) {
  const [containerRef, { width, height }] = useSize<HTMLDivElement>();
  const svgRef = useRef<SVGSVGElement>(null);
  const zoomRef = useRef<ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const [transform, setTransform] = useState<ZoomTransform>(zoomIdentity);
  const [zooming, setZooming] = useState(false);

  const selectedId = useStore((s) => s.selectedPersonId);
  const highlightIds = useStore((s) => s.highlightIds);
  const filter = useStore((s) => s.filter);
  const selectPerson = useStore((s) => s.selectPerson);
  const clearFocus = useStore((s) => s.clearFocus);
  const editing = useStore((s) => s.editRings);
  const setEditing = useStore((s) => s.setEditRings);
  const [hoverId, setHoverId] = useState<string | null>(null);

  // Step 2.
  // M10 step 4. Drifting people sit up to 6% of the map's size further out. driftStep() rounds
  // the level so the layout (which keys on this value) re-runs only on a visible change.
  const base = Math.min(width, height);
  const offsetFor = (p: Person) => driftStep(filterContext.drift?.get(p.id) ?? 0) * DRIFT_OFFSET * base;
  const layout = useForceLayout(people, links, width, height, offsetFor);
  const layoutPositions = layout.positions;
  // Memoized: the drag hook's effect depends on it (a new object per render would reset a drag).
  const g = useMemo(() => geometry(width, height), [width, height]);

  // Fix step 2. The zoom filter reads edit mode from a ref: d3 calls it outside React.
  const editingRef = useRef(editing);
  useEffect(() => {
    editingRef.current = editing;
  }, [editing]);
  const byId = useMemo(() => new Map(people.map((p) => [p.id, p])), [people]);
  const moveToRing = useCallback(
    (id: string, ring: Ring) => {
      const p = byId.get(id);
      if (!p || p.ring === ring) return;
      const from = p.ring;
      void updatePerson(id, { ring });
      toast(`Moved ${p.name} to ${RING_NAMES[ring]}`, { action: { label: 'Undo', onClick: () => void updatePerson(id, { ring: from }) } });
    },
    [byId],
  );
  const { drag, begin: beginDrag, consumeClick } = useRingDrag(svgRef, g, moveToRing);
  const onSelectNode = useCallback((id: string) => !consumeClick() && selectPerson(id), [consumeClick, selectPerson]);
  // The dragged person (and their lines and name) follow the pointer.
  const dragId = drag?.id;
  const dragPos = drag?.pos;
  const positions = useMemo(
    () => (dragId && dragPos ? new Map(layoutPositions).set(dragId, dragPos) : layoutPositions),
    [layoutPositions, dragId, dragPos],
  );

  // Step 3. d3 only computes the transform; React draws everything.
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    // `zooming` stays true until 150 ms after the last zoom frame (pans from panTo included),
    // so screen labels follow instantly while zooming and glide only when the layout moves.
    let settle: ReturnType<typeof setTimeout> | undefined;
    const behavior = d3zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.5, 3])
      // d3's default filter, plus: in edit mode a press on a person is a drag, not a pan.
      .filter((e: MouseEvent) => {
        if ((e.ctrlKey && e.type !== 'wheel') || e.button) return false;
        return !(editingRef.current && e.type !== 'wheel' && (e.target as Element | null)?.closest?.('[role="button"]'));
      })
      .on('zoom', (e: { transform: ZoomTransform }) => {
        setTransform(e.transform);
        setZooming(true);
        clearTimeout(settle);
        settle = setTimeout(() => setZooming(false), 150);
      });
    select(svg).call(behavior).on('dblclick.zoom', null);
    zoomRef.current = behavior;
    return () => {
      clearTimeout(settle);
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

  // Step 6. A selection wins (gray out all but the person and their links), then highlights,
  // then the filter. Dim, never remove, so nobody moves.
  const dimmedIds = useMemo(() => {
    const hasHighlights = highlightIds.size > 0;
    const out = new Set<string>();
    for (const p of people) {
      const dim = selectedId
        ? p.id !== selectedId && !neighborIds.has(p.id)
        : hasHighlights
          ? !highlightIds.has(p.id)
          : !matchesFilter(p, filter, filterContext);
      if (dim) out.add(p.id);
    }
    return out;
  }, [people, selectedId, neighborIds, highlightIds, filter, filterContext]);

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

  const ringAnchors = useMemo(
    () => RINGS.map((ring) => ({ ring, a: labelAngles[ring], r: ringRadius(geometry(width, height), ring) })),
    [labelAngles, width, height],
  );
  const center = useMemo(() => ({ x: g.cx, y: g.cy }), [g.cx, g.cy]);
  const labels = useScreenLabels({
    transform,
    zooming,
    people,
    byId,
    links,
    positions,
    ringAnchors,
    center,
    viewport: { width, height },
    selectedId,
    hoverId,
    highlightIds,
    neighborIds,
    dimmedIds,
  });

  const zoomed = transform.k !== 1 || transform.x !== 0 || transform.y !== 0;

  return (
    // Escape is global (App.tsx useHotkey), so the map has no key handler of its own.
    <div ref={containerRef} className="relative h-full w-full overflow-hidden">
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
                // Fix step 2: the ring a dragged person would land in is drawn solid and thick.
                stroke={drag?.ring === ring ? T.highlight : T.ringStroke}
                strokeWidth={drag?.ring === ring ? 3 : T.ringWidth}
                strokeDasharray={drag?.ring === ring ? undefined : T.ringDash}
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

          {/* The dragged person draws last (on top), but only once they MOVE: re-ordering on the press itself
              moves their DOM element, and Chrome then sends the follow-up mousedown to the parent <g>,
              which d3-zoom's filter doesn't see as a person and pans the map (found in testing). */}
          {(dragPos ? [...drawOrder.filter((p) => p.id !== dragId), ...drawOrder.filter((p) => p.id === dragId)] : drawOrder).map((p) => {
            const pos = positions.get(p.id);
            if (!pos) return null;
            return (
              <PersonNode
                key={p.id}
                person={p}
                x={pos.x}
                y={pos.y}
                color={tagColor(tags, p.primaryTag)}
                selected={selectedId === p.id}
                highlighted={highlightIds.has(p.id)}
                dimmed={dimmedIds.has(p.id)}
                flag={filterContext.overdueIds?.has(p.id) ? 'overdue' : filterContext.dueIds.has(p.id) ? 'due' : undefined}
                drift={driftStep(filterContext.drift?.get(p.id) ?? 0)}
                onSelect={onSelectNode}
                onHover={setHoverId}
                editing={editing}
                dragging={drag?.id === p.id && !!drag.pos}
                onDragStart={beginDrag}
                onSetRing={moveToRing}
              />
            );
          })}
        </g>

        {/* Screen space: names, ring labels and relationship labels, on top of everything. */}
        <ScreenLabels labels={labels.placed} fontSize={labels.fontSize} animate={labels.animate} />
      </svg>

      <Legend tags={tags} />
      {editing && (
        <p role="status" className="absolute top-3 left-1/2 w-max max-w-[calc(100%-1.5rem)] -translate-x-1/2 rounded-md border bg-background/95 px-3 py-1.5 text-center text-xs shadow-sm">
          {drag?.pos && drag.ring
            ? `Drop to move ${byId.get(drag.id)?.name ?? 'them'} to ${RING_NAMES[drag.ring]}`
            : 'Drag a person to another ring · or focus them and press 1, 2 or 3 · Esc to finish'}
        </p>
      )}
      <div className="absolute right-3 bottom-3 flex flex-col items-end gap-2">
        {zoomed && (
          <Button variant="outline" size="sm" onClick={resetView}>
            <Maximize /> Reset view
          </Button>
        )}
        <Button variant={editing ? 'default' : 'outline'} size="sm" aria-pressed={editing} onClick={() => setEditing(!editing)}>
          <Move /> {editing ? 'Done moving' : 'Move people'}
        </Button>
      </div>
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
