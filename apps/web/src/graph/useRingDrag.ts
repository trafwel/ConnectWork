/**
 * Fix step 2 (Oct 17) — drag a person to another ring ("Move people" edit mode)
 *
 * WHAT THIS ACHIEVES
 *   In edit mode you press on a person, drag them across the dashed ring lines and let go:
 *   they move to the ring you dropped them in. Escape during a drag cancels it.
 *   Oct 18: they also STAY where you dropped them (RingMap saves a pin), and dropping them onto
 *   another person offers to group the two (hitTest finds who is under the pointer).
 *
 * HOW IT FITS
 *   RingMap passes `start` to PersonNode as onDragStart and draws the dragged person at
 *   `drag.pos` (and highlights `drag.ring`). On drop it calls `onDrop(id, ring)`, which writes
 *   through updatePerson; layout.ts then re-places the person in their new ring.
 *
 * WHY THESE CHOICES
 *   - Window listeners, not pointer capture on the node: the node re-renders every move, and
 *     window listeners can't be lost when the pointer outruns it.
 *   - Screen → map coordinates: invert the zoom transform, x_map = (x_screen − t.x) / t.k.
 *     The transform is read from the <svg> (d3 keeps it there), so no ref copy can go stale.
 *   - A 4 px threshold: below it, it was a click (open the card), not a drag.
 *   - `g` and `onDrop` must be stable (useMemo/useCallback in RingMap): they are effect
 *     dependencies, and re-running the effect mid-drag would forget the drag.
 *   - `consumeClick()`: the browser still fires a click after a drag ends on the node. RingMap
 *     asks this before selecting, so a drop doesn't also open the card.
 */
import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type RefObject } from 'react';
import { zoomTransform } from 'd3-zoom';
import type { Ring } from '@connectwork/shared';
import { ringForDistance, type Geometry } from './layout';

const THRESHOLD = 4; // px on screen

interface Start {
  id: string;
  clientX: number;
  clientY: number;
}

export interface DragState {
  id: string;
  /** Pointer position in map units (null until it has moved past the threshold). */
  pos: { x: number; y: number } | null;
  /** The ring the person would land in if dropped now (null until moved). */
  ring: Ring | null;
  /** Oct 18: the person under the pointer, if any: dropping there groups the two. */
  over: string | null;
}

/** Oct 18: what a drop means. `over` set → group with that person; otherwise place at `pos`. */
export interface Drop {
  ring: Ring;
  pos: { x: number; y: number };
  over: string | null;
}

export function useRingDrag(
  svgRef: RefObject<SVGSVGElement | null>,
  g: Geometry,
  onDrop: (id: string, drop: Drop) => void,
  /** Oct 18: who is under a map point (excluding `id`); must be stable, like onDrop. */
  hitTest: (pos: { x: number; y: number }, id: string) => string | null = () => null,
) {
  const [start, setStart] = useState<Start | null>(null);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const dragged = useRef(false);

  const begin = useCallback((id: string, e: ReactPointerEvent<SVGGElement>) => {
    dragged.current = false;
    setStart({ id, clientX: e.clientX, clientY: e.clientY });
  }, []);

  useEffect(() => {
    const svg = svgRef.current;
    if (!start || !svg) return;
    let moved = false;
    let last: { x: number; y: number } | null = null;

    const toMap = (e: PointerEvent) => {
      const rect = svg.getBoundingClientRect();
      const t = zoomTransform(svg);
      return { x: (e.clientX - rect.left - t.x) / t.k, y: (e.clientY - rect.top - t.y) / t.k };
    };
    const finish = (commit: boolean) => {
      // RingMap compares with the person's current ring, so a drop in the same ring is a no-op.
      if (commit && moved && last) onDrop(start.id, { ring: ringForDistance(g, Math.hypot(last.x - g.cx, last.y - g.cy)), pos: last, over: hitTest(last, start.id) });
      dragged.current = moved;
      // If the drop wasn't on the node, no click follows: don't swallow the user's NEXT click.
      if (moved) setTimeout(() => (dragged.current = false), 0);
      setStart(null);
      setPos(null);
    };
    const onMove = (e: PointerEvent) => {
      if (!moved && Math.hypot(e.clientX - start.clientX, e.clientY - start.clientY) < THRESHOLD) return;
      moved = true;
      last = toMap(e);
      setPos(last);
    };
    const onUp = () => finish(true);
    const onCancel = () => finish(false);
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.stopPropagation(); // capture phase on window: App's Escape (leave edit mode) never sees it
      finish(false);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onCancel);
    window.addEventListener('keydown', onKey, true);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onCancel);
      window.removeEventListener('keydown', onKey, true);
    };
  }, [start, svgRef, g, onDrop, hitTest]);

  /** True once, right after a real drag: the click that follows it should be ignored. */
  const consumeClick = useCallback(() => {
    const was = dragged.current;
    dragged.current = false;
    return was;
  }, []);

  const drag: DragState | null = start
    ? { id: start.id, pos, ring: pos ? ringForDistance(g, Math.hypot(pos.x - g.cx, pos.y - g.cy)) : null, over: pos ? hitTest(pos, start.id) : null }
    : null;
  return { drag, begin, consumeClick };
}
