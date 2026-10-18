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
import { ArrowLeft, Maximize, Move } from 'lucide-react';
import { toast } from 'sonner';
import type { Link, Person, Ring, Tag } from '@connectwork/shared';
import { Button } from '@/components/ui/button';
import { Segmented } from '@/components/Segmented';
import { Input } from '@/components/ui/input';
import { connectPeople, deleteGroupIfUnused, ensureGroup, removeLink, updatePerson } from '@/db/actions';
import { nextGroupColor, safeColor, tagColor } from '@/lib/colors';
import { DRIFT_OFFSET, driftStep } from '@/lib/drift';
import { matchesFilter, type FilterContext } from '@/lib/filters';
import { useStore } from '@/store/useStore';
import { ClusterNode } from './ClusterNode';
import { aggregateLinks, buildClusters, groupConnections, linkIsShown } from './groups';
import { geometry, LABEL_ANGLE, NODE_RADIUS, pinFor, ringForDistance, ringRadius, useForceLayout } from './layout';
import { LinkLine } from './LinkLine';
import { PersonNode } from './PersonNode';
import { ScreenLabels, useScreenLabels } from './ScreenLabels';
import { useRingDrag, type Drop } from './useRingDrag';
import { mapTheme as T } from './theme';

const RINGS: Ring[] = [1, 2, 3];

/** Motion (Oct 18): who is flying out of / into a group node right now. */
interface Motion {
  key: string;
  clusterAt: Map<string, { x: number; y: number }>;
  visible: Set<string>;
  enter: Map<string, { x: number; y: number }>;
  leave: Map<string, { x: number; y: number }>;
  /** Still flying out: their names and lines wait until they land. */
  arriving: Set<string>;
  stamp: number;
}
const REDUCED_MOTION = typeof window !== 'undefined' && Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
const RING_NAMES: Record<Ring, string> = { 1: 'Close (ring 1)', 2: 'Regular (ring 2)', 3: 'Wider (ring 3)' };

interface Props {
  people: Person[];
  links: Link[];
  tags: Tag[];
  filterContext: FilterContext;
  /** Groups view (Oct 18): each tag collapses into one node until opened. */
  grouped?: boolean;
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


export function RingMap({ people, links, tags, filterContext, grouped = false }: Props) {
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
  // Oct 18 (team request): a drop keeps the person exactly there (a saved pin; the ring follows
  // from the distance), and a drop ONTO someone opens the grouping form instead of moving.
  const [pendingGroup, setPendingGroup] = useState<{ id: string; target: string; pos: { x: number; y: number } } | null>(null);
  const onDrop = useCallback(
    (id: string, drop: Drop) => {
      const p = byId.get(id);
      if (!p) return;
      if (drop.over) return setPendingGroup({ id, target: drop.over, pos: drop.pos });
      const before = { ring: p.ring, pin: p.pin };
      void updatePerson(id, { ring: drop.ring, pin: pinFor(g, drop.pos.x, drop.pos.y) });
      toast(drop.ring !== p.ring ? `Moved ${p.name} to ${RING_NAMES[drop.ring]}` : `Placed ${p.name}`, {
        action: { label: 'Undo', onClick: () => void updatePerson(id, before) },
      });
    },
    [byId, g],
  );
  // Who is under the pointer: read from a ref (updated after render), so the drag hook gets one
  // stable function and a drag isn't reset by every re-render.
  const hitRef = useRef<{ positions: Map<string, { x: number; y: number }>; visible: Set<string> | null; byId: Map<string, Person> }>({
    positions: new Map(),
    visible: null,
    byId: new Map(),
  });
  const hitTest = useCallback((pos: { x: number; y: number }, id: string) => {
    const { positions: at, visible, byId: people } = hitRef.current;
    let best: string | null = null;
    let bestD = Infinity;
    for (const [pid, q] of at) {
      const p = people.get(pid);
      if (pid === id || !p || (visible && !visible.has(pid))) continue;
      const d = Math.hypot(q.x - pos.x, q.y - pos.y);
      if (d <= NODE_RADIUS[p.ring] + 6 && d < bestD) {
        best = pid;
        bestD = d;
      }
    }
    return best;
  }, []);
  const { drag, begin: beginDrag, consumeClick } = useRingDrag(svgRef, g, onDrop, hitTest);
  // Polish (Oct 18): edit mode has two tools. Move (drag or 1/2/3, fix step 2) and Connect: click
  // (or Enter on) one person, then another, optionally name it → connectPeople, with Undo. The team
  // found no way to link people by hand on the map (the card's "Add connection" was too hidden).
  const [tool, setTool] = useState<'move' | 'connect'>('move');
  const [connectFrom, setConnectFrom] = useState<string | null>(null);
  const [pendingPair, setPendingPair] = useState<[string, string] | null>(null);
  const connecting = editing && tool === 'connect';
  const onSelectNode = useCallback(
    (id: string) => {
      if (consumeClick()) return;
      if (!connecting) return void selectPerson(id);
      if (!connectFrom || connectFrom === id) return setConnectFrom(connectFrom === id ? null : id);
      setPendingPair([connectFrom, id]);
    },
    [consumeClick, selectPerson, connecting, connectFrom],
  );
  const toggleEditing = () => {
    setTool('move');
    setConnectFrom(null);
    setPendingPair(null);
    setPendingGroup(null);
    setEditing(!editing);
  };
  const finishConnect = async (label: string) => {
    const pair = pendingPair;
    setPendingPair(null);
    setConnectFrom(null);
    if (!pair) return;
    const [a, b] = pair.map((id) => byId.get(id)?.name ?? 'them');
    const res = await connectPeople(pair[0], pair[1], label);
    if (!res) return;
    if (!res.created) toast(`${a} and ${b} were already connected${label.trim() ? ': name updated' : ''}`);
    else toast.success(`Connected ${a} and ${b}`, { action: { label: 'Undo', onClick: () => void removeLink(res.id) } });
  };
  // Oct 18: drop A onto B → A joins B's group, or both go into a new group. A lands right beside
  // B (on the side it came from) and stays there; in a new group B is pinned too, because a
  // custom group has no sector of its own and B would otherwise jump. Undo restores both.
  const finishGroup = async (choice: { join: true } | { name: string }) => {
    const pg = pendingGroup;
    setPendingGroup(null);
    const a = pg && byId.get(pg.id);
    const b = pg && byId.get(pg.target);
    const bAt = b && layoutPositions.get(b.id);
    if (!pg || !a || !b || !bAt) return;
    let dx = pg.pos.x - bAt.x;
    let dy = pg.pos.y - bAt.y;
    if (Math.hypot(dx, dy) < 1) [dx, dy] = [-(bAt.y - g.cy), bAt.x - g.cx]; // dropped dead center: go sideways
    const n = Math.hypot(dx, dy) || 1;
    const gap = NODE_RADIUS[a.ring] + NODE_RADIUS[b.ring] + 20; // room for both selection rings and a link label
    const aAt = { x: bAt.x + (dx / n) * gap, y: bAt.y + (dy / n) * gap };
    const snapshot = [a, b].map((p) => ({ id: p.id, patch: { ring: p.ring, pin: p.pin, primaryTag: p.primaryTag, tags: p.tags } }));
    let group = b.primaryTag;
    let created = false;
    if ('name' in choice) ({ name: group, created } = await ensureGroup(choice.name, nextGroupColor(tags)));
    const retag = (p: Person) => ({ primaryTag: group, tags: [group, ...p.tags.filter((t) => t !== p.primaryTag && t !== group)] });
    await updatePerson(a.id, { ...retag(a), ring: ringForDistance(g, Math.hypot(aAt.x - g.cx, aAt.y - g.cy)), pin: pinFor(g, aAt.x, aAt.y) });
    if (b.primaryTag !== group) await updatePerson(b.id, { ...retag(b), pin: b.pin ?? pinFor(g, bAt.x, bAt.y) });
    const undo = async () => {
      for (const s of snapshot) await updatePerson(s.id, s.patch);
      if (created) await deleteGroupIfUnused(group);
    };
    toast.success(b.primaryTag !== group ? `${a.name} and ${b.name} are now in ${group}` : `${a.name} joined ${group}`, {
      action: { label: 'Undo', onClick: () => void undo() },
    });
  };
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

  // Groups view (Oct 18). Closed groups become one node at their members' centre; the selected
  // person's group always opens (their card is showing, so they must be visible). Links between
  // hidden people merge into one count-weighted edge per pair of endpoints.
  const expandedGroups = useStore((s) => s.expandedGroups);
  const toggleGroup = useStore((s) => s.toggleGroup);
  const collapseGroups = useStore((s) => s.collapseGroups);
  const collapseLastGroup = useStore((s) => s.collapseLastGroup);
  const grouping = useMemo(
    () => (grouped ? buildClusters(people, positions, expandedGroups, new Set(selectedId ? [selectedId] : []), { x: g.cx, y: g.cy }) : null),
    [grouped, people, positions, expandedGroups, selectedId, g.cx, g.cy],
  );
  // Oct 18: the drag's hit test only counts people actually drawn (closed groups hide theirs).
  useLayoutEffect(() => {
    hitRef.current = { positions: layoutPositions, visible: grouping ? new Set(grouping.visible.map((p) => p.id)) : null, byId };
  });
  const visiblePeople = grouping?.visible ?? people;
  const shownLinks = useMemo(() => (grouping ? aggregateLinks(links, grouping.groupOf) : { personLinks: links, edges: [] }), [grouping, links]);
  const clusterStats = useMemo(() => {
    const out = new Map<string, { highlighted: number; due: number; drifting: number; dimmed: boolean }>();
    for (const c of grouping?.clusters ?? []) {
      const ids = c.memberIds;
      out.set(c.tag, {
        highlighted: ids.filter((id) => highlightIds.has(id)).length,
        due: ids.filter((id) => filterContext.dueIds.has(id)).length,
        drifting: ids.filter((id) => filterContext.driftingIds.has(id)).length,
        dimmed: ids.every((id) => dimmedIds.has(id)),
      });
    }
    return out;
  }, [grouping, highlightIds, filterContext, dimmedIds]);
  // Declutter (Oct 18): people in focus get their lines drawn even on the outer ring.
  const focusIds = useMemo(() => new Set([...highlightIds, ...(hoverId ? [hoverId] : [])]), [highlightIds, hoverId]);
  const ringOf = (id: string) => byId.get(id)?.ring;
  const anyGroupOpen = grouped && expandedGroups.size > 0;

  // Motion (Oct 18): people fly OUT of a group node when it opens (and when switching to Map) and
  // fly INTO it when it closes (and when switching to Groups), instead of popping in and out.
  // Derived state, updated during render when what's visible changes (React's "adjust state when
  // a prop changes" pattern); the effect below lets the CSS transitions run, then clears it.
  const visibleKey = grouped ? `g:${[...expandedGroups].join(',')}|${selectedId ?? ''}` : 'map';
  const [motion, setMotion] = useState<Motion | null>(null);
  if (positions.size > 0 && (!motion || motion.key !== visibleKey)) {
    const clusterAt = new Map((grouping?.clusters ?? []).map((c) => [c.tag, { x: c.x, y: c.y }]));
    const visibleIds = new Set(visiblePeople.map((p) => p.id));
    const enter = new Map<string, { x: number; y: number }>();
    const leave = new Map<string, { x: number; y: number }>();
    if (motion && !REDUCED_MOTION) {
      for (const id of visibleIds) {
        const from = motion.visible.has(id) ? undefined : motion.clusterAt.get(byId.get(id)?.primaryTag ?? '');
        if (from) enter.set(id, from);
      }
      for (const id of motion.visible) {
        const to = visibleIds.has(id) ? undefined : clusterAt.get(byId.get(id)?.primaryTag ?? '');
        if (to) leave.set(id, to);
      }
    }
    setMotion({ key: visibleKey, clusterAt, visible: visibleIds, enter, leave, arriving: new Set(enter.keys()), stamp: (motion?.stamp ?? 0) + 1 });
  }
  const motionStamp = motion?.stamp ?? 0;
  const moving = Boolean(motion && (motion.enter.size || motion.leave.size || motion.arriving.size));
  useEffect(() => {
    if (!moving) return;
    // The browser paints people at the group node first, THEN (40 ms later) at their places, so
    // the 450 ms CSS transform transition carries them out. A timer, not animation frames: frames
    // stall in background tabs and would leave people parked at the node. After the transition
    // the leavers are removed.
    const release = setTimeout(() => setMotion((m) => (m && m.stamp === motionStamp ? { ...m, enter: new Map() } : m)), 40);
    const done = setTimeout(() => setMotion((m) => (m && m.stamp === motionStamp ? { ...m, leave: new Map(), arriving: new Set() } : m)), 520);
    return () => {
      clearTimeout(release);
      clearTimeout(done);
    };
  }, [moving, motionStamp]);

  // Ring 3 first so closer people draw on top. Sorted once per data change, not per zoom frame.
  // Motion: people flying into a group are still drawn until they arrive.
  const drawOrder = useMemo(() => {
    const leaving = [...(motion?.leave.keys() ?? [])].flatMap((id) => byId.get(id) ?? []);
    return [...visiblePeople, ...leaving].sort((a, b) => b.ring - a.ring);
  }, [visiblePeople, motion, byId]);
  const labelPeople = useMemo(() => (motion?.arriving.size ? visiblePeople.filter((p) => !motion.arriving.has(p.id)) : visiblePeople), [visiblePeople, motion]);

  // Step 8c. Center the selected person once per selection and map size, but only on a layout
  // computed for THIS size (opening the card narrows the map and the layout recomputes).
  // Declutter: opening a group zooms the map to fit its people; closing it zooms back out.
  // Oct 18 (team request): on the Map view, clicking a group in the filter list (Work, School…)
  // zooms to it the same way, so its people and their labels are readable without scrolling;
  // All, Due or Drifting zooms back out.
  const openTag = grouped ? ([...expandedGroups].at(-1) ?? null) : null;
  const tagFilter = !grouped && filter !== 'all' && filter !== 'due' && filter !== 'drifting' ? filter : null;
  const zoomTag = grouped ? openTag : tagFilter;
  const zoomedFor = useRef<string | null>(null);
  useEffect(() => {
    const svg = svgRef.current;
    const behavior = zoomRef.current;
    if (!svg || !behavior || layout.width !== width || layout.height !== height || !width) return;
    if (zoomTag && zoomedFor.current !== zoomTag) {
      const pts = people.filter((p) => p.primaryTag === zoomTag).flatMap((p) => positions.get(p.id) ?? []);
      if (!pts.length) return;
      const xs = pts.map((p) => p.x);
      const ys = pts.map((p) => p.y);
      const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
      const k = Math.max(0.8, Math.min(2.5, (width - 140) / (x1 - x0 + 60), (height - 140) / (y1 - y0 + 60)));
      zoomTo(svg, behavior, { x: width / 2 - k * ((x0 + x1) / 2), y: height / 2 - k * ((y0 + y1) / 2), k });
      zoomedFor.current = zoomTag;
    } else if (!zoomTag && zoomedFor.current) {
      zoomTo(svg, behavior, { x: 0, y: 0, k: 1 });
      zoomedFor.current = null;
    }
  }, [zoomTag, people, positions, layout.width, layout.height, width, height]);

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
    people: labelPeople,
    byId,
    links: shownLinks.personLinks,
    clusters: grouping?.clusters,
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
            {/* Declutter: only close people's lines, or lines in focus (see linkIsShown). */}
            {shownLinks.personLinks.map((l) => {
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
                  hidden={!linkIsShown(l, ringOf, selectedId, focusIds) || Boolean(motion?.arriving.has(l.fromId) || motion?.arriving.has(l.toId))}
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

          {/* Groups view: closed groups, under the people of open ones. */}
          {grouping?.clusters.map((c) => {
            const st = clusterStats.get(c.tag)!;
            return (
              <ClusterNode
                key={c.tag}
                cluster={c}
                color={tagColor(tags, c.tag)}
                highlighted={st.highlighted}
                due={st.due}
                drifting={st.drifting}
                dimmed={st.dimmed}
                muted={anyGroupOpen}
                connections={groupConnections(c.tag, shownLinks.edges)}
                onToggle={toggleGroup}
              />
            );
          })}

          {/* The dragged person draws last (on top), but only once they MOVE: re-ordering on the press itself
              moves their DOM element, and Chrome then sends the follow-up mousedown to the parent <g>,
              which d3-zoom's filter doesn't see as a person and pans the map (found in testing). */}
          {(dragPos ? [...drawOrder.filter((p) => p.id !== dragId), ...drawOrder.filter((p) => p.id === dragId)] : drawOrder).map((p) => {
            const flying = motion?.enter.get(p.id) ?? motion?.leave.get(p.id);
            const pos = flying ?? positions.get(p.id);
            if (!pos) return null;
            return (
              <PersonNode
                key={p.id}
                person={p}
                x={pos.x}
                y={pos.y}
                color={tagColor(tags, p.primaryTag)}
                selected={selectedId === p.id || (connecting && connectFrom === p.id)}
                highlighted={highlightIds.has(p.id) || drag?.over === p.id}
                dimmed={dimmedIds.has(p.id)}
                flag={filterContext.overdueIds?.has(p.id) ? 'overdue' : filterContext.dueIds.has(p.id) ? 'due' : undefined}
                drift={driftStep(filterContext.drift?.get(p.id) ?? 0)}
                vanish={Boolean(flying)}
                recede={p.ring === 3 && p.id !== selectedId && p.id !== hoverId && !highlightIds.has(p.id) && !neighborIds.has(p.id)}
                onSelect={onSelectNode}
                onHover={setHoverId}
                editing={editing}
                dragging={drag?.id === p.id && !!drag.pos}
                onDragStart={connecting ? undefined : beginDrag}
                onSetRing={moveToRing}
              />
            );
          })}
        </g>

        {/* Screen space: names, ring labels and relationship labels, on top of everything. */}
        <ScreenLabels labels={labels.placed} fontSize={labels.fontSize} animate={labels.animate} />
      </svg>

      {/* Polish (Oct 18): a visible way back out of an opened group (Escape does the same). */}
      {grouped && expandedGroups.size > 0 && (
        <Button variant="outline" size="sm" className="absolute top-3 right-3" onClick={collapseLastGroup} aria-keyshortcuts="Escape">
          <ArrowLeft /> Back (close {[...expandedGroups].at(-1)})
        </Button>
      )}
      {grouped ? (
        <GroupPanel people={people} tags={tags} open={grouping ? new Set(grouping.visible.map((p) => p.primaryTag)) : new Set()} onToggle={toggleGroup} onCloseAll={collapseGroups} />
      ) : (
        <Legend tags={tags} />
      )}
      {editing && (
        <div className="absolute top-3 left-1/2 flex w-max max-w-[calc(100%-1.5rem)] -translate-x-1/2 flex-col items-center gap-1.5">
          <Segmented
            label="Edit tool"
            value={tool}
            onChange={(t) => {
              setTool(t);
              setConnectFrom(null);
              setPendingPair(null);
            }}
            options={[
              { value: 'move', label: 'Move' },
              { value: 'connect', label: 'Connect' },
            ]}
          />
          {pendingPair ? (
            <ConnectForm a={byId.get(pendingPair[0])?.name ?? ''} b={byId.get(pendingPair[1])?.name ?? ''} onDone={finishConnect} onCancel={() => setPendingPair(null)} />
          ) : pendingGroup ? (
            <GroupForm
              a={byId.get(pendingGroup.id)?.name ?? ''}
              b={byId.get(pendingGroup.target)?.name ?? ''}
              group={byId.get(pendingGroup.target)?.primaryTag ?? ''}
              sameGroup={byId.get(pendingGroup.id)?.primaryTag === byId.get(pendingGroup.target)?.primaryTag}
              onJoin={() => void finishGroup({ join: true })}
              onCreate={(name) => void finishGroup({ name })}
              onCancel={() => setPendingGroup(null)}
            />
          ) : (
            <p role="status" className="rounded-md border bg-background/95 px-3 py-1.5 text-center text-xs shadow-sm">
              {connecting
                ? connectFrom
                  ? `Now click who ${byId.get(connectFrom)?.name ?? 'they'} knows · click them again to cancel`
                  : 'Click a person, then the person they know (or focus and press Enter) · Esc to finish'
                : drag?.pos && drag.over
                  ? `Drop on ${byId.get(drag.over)?.name ?? 'them'} to group them together`
                  : drag?.pos && drag.ring
                    ? `Drop to place ${byId.get(drag.id)?.name ?? 'them'} here, in ${RING_NAMES[drag.ring]}`
                    : 'Drag a person anywhere · drop them on someone to group them · or focus and press 1, 2 or 3 · Esc to finish'}
            </p>
          )}
        </div>
      )}
      <div className="absolute right-3 bottom-3 flex flex-col items-end gap-2">
        {zoomed && (
          <Button variant="outline" size="sm" onClick={resetView}>
            <Maximize /> Reset view
          </Button>
        )}
        <Button variant={editing ? 'default' : 'outline'} size="sm" aria-pressed={editing} onClick={toggleEditing}>
          <Move /> {editing ? 'Done editing' : 'Edit map'}
        </Button>
      </div>
    </div>
  );
}

/** Polish (Oct 18): name the new connection (optional), right where the two people were picked. */
/** Oct 18: what to do with a person dropped onto another one. */
function GroupForm({
  a,
  b,
  group,
  sameGroup,
  onJoin,
  onCreate,
  onCancel,
}: {
  a: string;
  b: string;
  group: string;
  sameGroup: boolean;
  onJoin: () => void;
  onCreate: (name: string) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState('');
  return (
    <form
      className="flex flex-wrap items-center justify-center gap-1.5 rounded-md border bg-background/95 px-2 py-1.5 text-xs shadow-sm"
      onSubmit={(e) => {
        e.preventDefault();
        if (name.trim()) onCreate(name);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.stopPropagation(); // cancel the grouping, stay in edit mode
          onCancel();
        }
      }}
    >
      <span className="whitespace-nowrap">
        Group <b>{a}</b> with <b>{b}</b>:
      </span>
      {!sameGroup && (
        <Button type="button" size="xs" onClick={onJoin}>
          Add to {group}
        </Button>
      )}
      <Input
        autoFocus
        value={name}
        maxLength={40}
        onChange={(e) => setName(e.target.value)}
        placeholder={sameGroup ? 'Name a new group for both' : 'or name a new group'}
        aria-label={`New group for ${a} and ${b}`}
        className="h-7 w-44 text-xs"
      />
      <Button type="submit" size="xs" variant="outline" disabled={!name.trim()}>
        Create group
      </Button>
      <Button type="button" size="xs" variant="ghost" onClick={onCancel}>
        Cancel
      </Button>
    </form>
  );
}

function ConnectForm({ a, b, onDone, onCancel }: { a: string; b: string; onDone: (label: string) => void; onCancel: () => void }) {
  const [label, setLabel] = useState('');
  return (
    <form
      className="flex items-center gap-1.5 rounded-md border bg-background/95 px-2 py-1.5 text-xs shadow-sm"
      onSubmit={(e) => {
        e.preventDefault();
        onDone(label);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.stopPropagation(); // cancel this pair, stay in edit mode
          onCancel();
        }
      }}
    >
      <span className="whitespace-nowrap">
        Connect <b>{a}</b> and <b>{b}</b>
      </span>
      <Input
        autoFocus
        value={label}
        maxLength={60}
        onChange={(e) => setLabel(e.target.value)}
        placeholder="How do they know each other? (optional)"
        aria-label={`Relationship between ${a} and ${b}`}
        className="h-7 w-64 text-xs"
      />
      <Button type="submit" size="xs">
        Connect
      </Button>
      <Button type="button" size="xs" variant="ghost" onClick={onCancel}>
        Cancel
      </Button>
    </form>
  );
}

/**
 * Groups view: the legend becomes the list of groups, each a button that opens or closes it
 * (the keyboard and list path for the map's group nodes, and the way to close an open group).
 */
function GroupPanel({ people, tags, open, onToggle, onCloseAll }: { people: Person[]; tags: Tag[]; open: Set<string>; onToggle: (tag: string) => void; onCloseAll: () => void }) {
  const counts = new Map<string, number>();
  for (const p of people) counts.set(p.primaryTag, (counts.get(p.primaryTag) ?? 0) + 1);
  return (
    <div className="absolute bottom-3 left-3 max-w-[calc(100%-1.5rem)] rounded-md border bg-background/90 px-3 py-2 text-xs">
      <div className="mb-1 flex items-center justify-between gap-4">
        <span className="font-medium">Groups</span>
        {open.size > 0 && (
          <button className="text-muted-foreground underline-offset-2 hover:underline" onClick={onCloseAll}>
            Close all
          </button>
        )}
      </div>
      {/* Wraps instead of a fixed 3-column grid: with a side panel open the map is narrow and names got cut off. */}
      <ul className="flex flex-wrap gap-x-1 gap-y-0.5" aria-label="Groups">
        {[...counts].map(([tag, n]) => (
          <li key={tag}>
            <button
              aria-expanded={open.has(tag)}
              onClick={() => onToggle(tag)}
              className={`flex items-center gap-1.5 rounded-sm px-1 py-0.5 whitespace-nowrap hover:bg-muted ${open.has(tag) ? 'font-medium' : ''}`}
            >
              <span className="inline-block size-2.5 rounded-full" style={{ background: tagColor(tags, tag) }} aria-hidden="true" />
              {tag} <span className="text-muted-foreground tabular-nums">{n}</span>
              <span className="text-muted-foreground" aria-hidden="true">
                {open.has(tag) ? '▾' : '▸'}
              </span>
            </button>
          </li>
        ))}
      </ul>
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
  const k = zoomTransform(svg).k;
  zoomTo(svg, behavior, { x: width / 2 - k * pos.x, y: height / 2 - k * pos.y, k });
}

/** Declutter: animate to any view (translate + zoom). panTo is the keep-the-zoom case. */
function zoomTo(svg: SVGSVGElement, behavior: ZoomBehavior<SVGSVGElement, unknown>, to: { x: number; y: number; k: number }) {
  const from = zoomTransform(svg);
  const apply = (x: number, y: number, k: number) => select(svg).call(behavior.transform, zoomIdentity.translate(x, y).scale(k));
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches || document.hidden) {
    apply(to.x, to.y, to.k);
    return;
  }
  const duration = 450;
  const start = performance.now();
  const ease = (t: number) => 1 - (1 - t) ** 3; // ease-out cubic
  const step = (now: number) => {
    const t = Math.min(1, (now - start) / duration);
    const e = ease(t);
    apply(from.x + (to.x - from.x) * e, from.y + (to.y - from.y) * e, from.k + (to.k - from.k) * e);
    if (t < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}
