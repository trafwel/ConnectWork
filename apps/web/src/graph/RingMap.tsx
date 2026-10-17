/**
 * M2 — Ring map (SVG) · Owner: Person A · ~2 h (+ focus on click, ~45 min)
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
import type { Link, Person, Tag } from '@connectwork/shared';
import type { FilterContext } from '@/lib/filters';

interface Props {
  people: Person[];
  links: Link[];
  tags: Tag[];
  filterContext: FilterContext;
  offsetFor?: (p: Person) => number;
}

export function RingMap(_props: Props) {
  // TODO(M2) steps 1–10
  return null;
}
