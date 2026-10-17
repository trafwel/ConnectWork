/**
 * M2 — Ring map (SVG) · done
 *
 * WHAT THIS ACHIEVES
 *   The heart of the product: your network as rings around you. Pan and zoom,
 *   click a person to open their card, see who an AI answer is about (highlights),
 *   and filter without anyone moving.
 *
 * HOW IT FITS
 *   App passes people, links, tags and filterContext. Selection, highlights and the
 *   filter come from the store. Layout from layout.ts; nodes and links are drawn by
 *   PersonNode and LinkLine. Colors move to graph/theme.ts in step T.
 *
 * HOW IT WAS BUILT
 *   1. Measure the container on mount (getBoundingClientRect) AND with a
 *      ResizeObserver — the observer alone reports nothing in a hidden tab.
 *   2. Layers back to front: dashed rings + labels (placed in the gap between the
 *      LinkedIn and Work sectors), links, the "You" node, people sorted ring 3 → 1.
 *   3. Dimming: when anything is highlighted, everyone else fades to 15%; otherwise
 *      people outside the current filter fade. Nobody is removed, so nothing jumps.
 *   4. d3-zoom on the <svg> (0.5–3×, double-click zoom off); a Reset view button
 *      appears when zoomed or panned. Clicking empty space clears the selection.
 *   5. A tag-color legend in the corner.
 *
 * DONE WHEN
 *   - Zoom, pan, click-to-open, reset view and keyboard selection all work.
 *
 * Guide: §6.2
 */
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { select } from 'd3-selection';
import { zoom as d3zoom, zoomIdentity, type ZoomBehavior, type ZoomTransform } from 'd3-zoom';
import { Maximize } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Link, Person, Ring, Tag } from '@connectwork/shared';
import { tagColor } from '@/lib/colors';
import { matchesFilter, type FilterContext } from '@/lib/filters';
import { useStore } from '@/store/useStore';
import { geometry, LABEL_ANGLE, ringRadius, useForceLayout } from './layout';
import { LinkLine } from './LinkLine';
import { PersonNode } from './PersonNode';

const RING_LABELS: Record<Ring, string> = { 1: 'Close', 2: 'Regular', 3: 'Wider' };

interface Props {
  people: Person[];
  links: Link[];
  tags: Tag[];
  filterContext: FilterContext;
  offsetFor?: (p: Person) => number;
}

function useSize<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Measure immediately; ResizeObserver only reports on rendered frames.
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

export function RingMap({ people, links, tags, filterContext, offsetFor }: Props) {
  const [containerRef, { width, height }] = useSize<HTMLDivElement>();
  const svgRef = useRef<SVGSVGElement>(null);
  const [transform, setTransform] = useState<ZoomTransform>(zoomIdentity);
  const zoomRef = useRef<ZoomBehavior<SVGSVGElement, unknown> | null>(null);

  const selectedId = useStore((s) => s.selectedPersonId);
  const highlightIds = useStore((s) => s.highlightIds);
  const filter = useStore((s) => s.filter);
  const selectPerson = useStore((s) => s.selectPerson);
  const clearFocus = useStore((s) => s.clearFocus);

  const positions = useForceLayout(people, links, width, height, offsetFor);
  const g = geometry(width, height);

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

  const hasHighlights = highlightIds.size > 0;
  const isDimmed = useCallback(
    (p: Person) => (hasHighlights ? !highlightIds.has(p.id) : !matchesFilter(p, filter, filterContext)),
    [hasHighlights, highlightIds, filter, filterContext],
  );
  const dimmedIds = useMemo(() => new Set(people.filter(isDimmed).map((p) => p.id)), [people, isDimmed]);

  return (
    <div ref={containerRef} className="relative h-full w-full overflow-hidden">
      <svg
        ref={svgRef}
        width={width}
        height={height}
        className="block select-none"
        role="group"
        aria-label="Network map. People closer to the center are closer to you."
        onClick={() => clearFocus()}
      >
        <g transform={transform.toString()}>
          {([3, 2, 1] as Ring[]).map((ring) => (
            <g key={ring} aria-hidden="true">
              <circle cx={g.cx} cy={g.cy} r={ringRadius(g, ring)} fill="none" stroke="#cbd5e1" strokeDasharray="2 6" />
              <text
                x={g.cx + ringRadius(g, ring) * Math.cos(LABEL_ANGLE)}
                y={g.cy + ringRadius(g, ring) * Math.sin(LABEL_ANGLE)}
                dy="-0.4em"
                textAnchor="middle"
                fontSize={11}
                fill="#94a3b8"
              >
                {RING_LABELS[ring]}
              </text>
            </g>
          ))}

          <g aria-hidden="true">
            {links.map((l) => {
              const a = positions.get(l.fromId);
              const b = positions.get(l.toId);
              if (!a || !b) return null;
              return <LinkLine key={l.id} link={l} from={a} to={b} dimmed={dimmedIds.has(l.fromId) || dimmedIds.has(l.toId)} />;
            })}
          </g>

          <g aria-hidden="true">
            <circle cx={g.cx} cy={g.cy} r={26} fill="#0f172a" />
            <text x={g.cx} y={g.cy} dy="0.35em" textAnchor="middle" fontSize={12} fontWeight={600} fill="white">
              You
            </text>
          </g>

          {/* ring 3 first so closer people draw on top */}
          {[...people]
            .sort((a, b) => b.ring - a.ring)
            .map((p) => {
              const pos = positions.get(p.id);
              if (!pos) return null;
              return (
                <PersonNode
                  key={p.id}
                  person={p}
                  x={pos.x}
                  y={pos.y}
                  color={tagColor(tags, p.primaryTag)}
                  zoom={transform.k}
                  selected={selectedId === p.id}
                  highlighted={highlightIds.has(p.id)}
                  dimmed={dimmedIds.has(p.id)}
                  onSelect={selectPerson}
                />
              );
            })}
        </g>
      </svg>
      <Legend tags={tags} />
      {transform.k !== 1 || transform.x !== 0 || transform.y !== 0 ? (
        <Button
          variant="outline"
          size="sm"
          className="absolute right-3 bottom-3"
          onClick={() => {
            if (svgRef.current && zoomRef.current) select(svgRef.current).call(zoomRef.current.transform, zoomIdentity);
          }}
        >
          <Maximize /> Reset view
        </Button>
      ) : null}
    </div>
  );
}

function Legend({ tags }: { tags: Tag[] }) {
  const shown = tags.filter((t) => t.behavior === 'none');
  return (
    <ul className="absolute bottom-3 left-3 flex flex-wrap gap-x-3 gap-y-1 rounded-md bg-background/80 px-3 py-2 text-xs backdrop-blur" aria-label="Tag colors">
      {shown.map((t) => (
        <li key={t.name} className="flex items-center gap-1.5">
          <span className="inline-block size-2.5 rounded-full" style={{ background: t.color }} aria-hidden="true" />
          {t.name}
        </li>
      ))}
    </ul>
  );
}
