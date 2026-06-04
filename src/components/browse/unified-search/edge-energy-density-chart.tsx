"use client";

/**
 * Compact SVG energy density chart for the NEXAFS edge picker modal.
 *
 * Renders a filled histogram area of spectrum-point photon energies in the
 * catalog, vertical dashed markers at each edge's representative energy,
 * an accent-colored band spanning the energy range of currently selected
 * edges, and x-axis tick labels at 100 eV intervals.
 *
 * All rendering is pure SVG; no external charting library is required.
 */

import { useId, useMemo } from "react";

/** Shape of one edge returned from `experiments.edgeCatalogStats`. */
export interface CatalogEdgeStat {
  id: string;
  targetatom: string;
  corestate: string;
  minEv: number | null;
  maxEv: number | null;
}

/** Energy histogram returned from `experiments.edgeCatalogStats`. */
export interface EnergyHistogram {
  bucketMinEv: number;
  bucketMaxEv: number;
  bins: number;
  buckets: number[];
}

export interface EdgeEnergyDensityChartProps {
  /** Edges with energy spans from spectrum point data. */
  edgesInCatalog: CatalogEdgeStat[];
  /** Pre-bucketed energy histogram. */
  energyHistogram: EnergyHistogram;
  /** Currently selected edge UUIDs; determines the accent band position. */
  selectedEdgeIds: string[];
}

const CHART_W = 600;
const CHART_H = 56;
const PAD_L = 8;
const PAD_R = 8;
const LABEL_BAND_H = 10;
const PAD_B = 11;
const PLOT_TOP = LABEL_BAND_H;
const PLOT_W = CHART_W - PAD_L - PAD_R;
const PLOT_H = CHART_H - PLOT_TOP - PAD_B;
const LABEL_HALF_WIDTH_PX = 16;
const LABEL_MIN_GAP_PX = 4;

function evToX(ev: number, minEv: number, maxEv: number): number {
  return PAD_L + ((ev - minEv) / (maxEv - minEv)) * PLOT_W;
}

/**
 * Picks a representative photon energy for an edge marker by locating the
 * strongest histogram bin inside the edge's measured span. Wide scans make
 * the midpoint of min/max misleading (for example C K near 284 eV); the peak
 * aligns the marker with catalog density on the curve.
 */
function representativeEvForEdge(
  minEv: number,
  maxEv: number,
  smoothed: number[],
  bucketMinEv: number,
  bucketMaxEv: number,
): number {
  const n = smoothed.length;
  if (n === 0) return minEv;
  const binWidth = (bucketMaxEv - bucketMinEv) / n;
  let bestEv = minEv;
  let bestCount = -1;
  for (let i = 0; i < n; i++) {
    const binMid = bucketMinEv + (i + 0.5) * binWidth;
    if (binMid < minEv || binMid > maxEv) continue;
    const count = smoothed[i] ?? 0;
    if (count > bestCount) {
      bestCount = count;
      bestEv = binMid;
    }
  }
  return bestCount > 0 ? bestEv : minEv;
}

type MarkerLabelLayout = {
  id: string;
  labelX: number;
  labelY: number;
  textAnchor: "start" | "middle" | "end";
};

/**
 * Assigns staggered label rows and small horizontal offsets so nearby edge
 * labels (for example C K and N K) do not overlap.
 */
function layoutMarkerLabels(
  markers: Array<{ id: string; lineX: number; label: string }>,
): MarkerLabelLayout[] {
  const sorted = [...markers].sort((a, b) => a.lineX - b.lineX);
  const laneY = [4, 8] as const;
  const placed: Array<{ x0: number; x1: number; lane: number }> = [];
  const out: MarkerLabelLayout[] = [];

  for (const m of sorted) {
    let chosen: MarkerLabelLayout | null = null;
    const nudgeSteps = [0, -10, 10, -18, 18];

    for (let lane = 0; lane < laneY.length && chosen === null; lane++) {
      for (const nudge of nudgeSteps) {
        const labelX = Math.min(
          CHART_W - PAD_R - LABEL_HALF_WIDTH_PX,
          Math.max(PAD_L + LABEL_HALF_WIDTH_PX, m.lineX + nudge),
        );
        const x0 = labelX - LABEL_HALF_WIDTH_PX;
        const x1 = labelX + LABEL_HALF_WIDTH_PX;
        const overlaps = placed.some(
          (p) =>
            p.lane === lane &&
            x0 < p.x1 + LABEL_MIN_GAP_PX &&
            x1 > p.x0 - LABEL_MIN_GAP_PX,
        );
        if (overlaps) continue;

        let textAnchor: MarkerLabelLayout["textAnchor"] = "middle";
        if (labelX <= PAD_L + LABEL_HALF_WIDTH_PX + 2) textAnchor = "start";
        else if (labelX >= CHART_W - PAD_R - LABEL_HALF_WIDTH_PX - 2) {
          textAnchor = "end";
        }

        placed.push({ x0, x1, lane });
        chosen = {
          id: m.id,
          labelX,
          labelY: laneY[lane] ?? laneY[0],
          textAnchor,
        };
        break;
      }
    }

    out.push(
      chosen ?? {
        id: m.id,
        labelX: m.lineX,
        labelY: laneY[0],
        textAnchor: "middle",
      },
    );
  }

  return out;
}

/**
 * Applies a 3-bin weighted moving average to reduce histogram noise.
 * Weights: [1, 2, 1] / 4.
 */
function smoothBuckets(buckets: number[]): number[] {
  const n = buckets.length;
  const out = new Array<number>(n).fill(0);
  for (let i = 0; i < n; i++) {
    const a = buckets[i - 1] ?? 0;
    const b = buckets[i] ?? 0;
    const c = buckets[i + 1] ?? 0;
    out[i] = (a + 2 * b + c) / 4;
  }
  return out;
}

/**
 * Builds a filled SVG path for the density area from smoothed histogram
 * buckets. Each bucket is plotted at its midpoint energy, connected by
 * straight lines, and closed along the baseline.
 */
function densityCurvePoints(
  smoothed: number[],
  maxCount: number,
  minEv: number,
  maxEv: number,
): Array<{ x: number; y: number }> {
  const n = smoothed.length;
  if (n === 0 || maxCount === 0) return [];
  const binWidth = (maxEv - minEv) / n;
  return smoothed.map((count, i) => {
    const ev = minEv + (i + 0.5) * binWidth;
    const x = evToX(ev, minEv, maxEv);
    const norm = count / maxCount;
    const y = PLOT_TOP + PLOT_H * (1 - norm);
    return { x, y };
  });
}

function densityAreaPath(
  pts: Array<{ x: number; y: number }>,
  minEv: number,
  maxEv: number,
): string {
  if (pts.length === 0) return "";
  const yBase = PLOT_TOP + PLOT_H;
  const xStart = evToX(minEv, minEv, maxEv).toFixed(1);
  const xEnd = evToX(maxEv, minEv, maxEv).toFixed(1);
  const yBaseStr = yBase.toFixed(1);

  return [
    `M ${xStart},${yBaseStr}`,
    ...pts.map((p) => `L ${p.x.toFixed(1)},${p.y.toFixed(1)}`),
    `L ${xEnd},${yBaseStr}`,
    "Z",
  ].join(" ");
}

function densityStrokePath(pts: Array<{ x: number; y: number }>): string {
  if (pts.length === 0) return "";
  const [first, ...rest] = pts;
  return [
    `M ${first.x.toFixed(1)},${first.y.toFixed(1)}`,
    ...rest.map((p) => `L ${p.x.toFixed(1)},${p.y.toFixed(1)}`),
  ].join(" ");
}

/**
 * Energy where catalog density falls below a fraction of peak; used to fade
 * the fill in the high-energy tail so empty span reads as intentional.
 */
function tailFadeStartEv(
  smoothed: number[],
  maxCount: number,
  bucketMinEv: number,
  bucketMaxEv: number,
  peakFraction: number,
): number {
  const n = smoothed.length;
  if (n === 0 || maxCount === 0) return bucketMaxEv;
  const threshold = maxCount * peakFraction;
  const binWidth = (bucketMaxEv - bucketMinEv) / n;
  for (let i = n - 1; i >= 0; i--) {
    if ((smoothed[i] ?? 0) >= threshold) {
      return bucketMinEv + (i + 0.5) * binWidth;
    }
  }
  return bucketMinEv;
}

/**
 * Renders a compact SVG energy density chart for the NEXAFS periodic edge
 * picker modal.
 *
 * The chart shows a filled area of spectrum-point energy distribution, a
 * semi-transparent accent band over the energy range of currently selected
 * edges, dashed vertical markers at each edge's histogram-peak energy within
 * its measured span (with collision-aware staggered labels), and x-axis tick
 * marks at 100 eV intervals. Renders at a fixed 56px height in the modal.
 *
 * @param edgesInCatalog - Edges with measured minEv/maxEv from the server.
 * @param energyHistogram - Histogram with `bins` equal-width buckets
 *   spanning [bucketMinEv, bucketMaxEv].
 * @param selectedEdgeIds - UUIDs of currently selected edges; drives the
 *   accent band that highlights their combined energy span.
 */
export function EdgeEnergyDensityChart({
  edgesInCatalog,
  energyHistogram,
  selectedEdgeIds,
}: EdgeEnergyDensityChartProps) {
  const uid = useId().replace(/:/g, "");
  const fillYId = `edge-density-fill-y-${uid}`;
  const fillXId = `edge-density-fill-x-${uid}`;
  const tailMaskId = `edge-density-tail-mask-${uid}`;

  const { bucketMinEv, bucketMaxEv, buckets } = energyHistogram;
  const selectedSet = useMemo(() => new Set(selectedEdgeIds), [selectedEdgeIds]);

  const smoothed = useMemo(() => smoothBuckets(buckets), [buckets]);
  const maxCount = useMemo(() => Math.max(...smoothed, 1), [smoothed]);
  const displaySmoothed = useMemo(
    () => smoothBuckets(smoothed),
    [smoothed],
  );

  const curvePts = useMemo(
    () =>
      densityCurvePoints(
        displaySmoothed,
        maxCount,
        bucketMinEv,
        bucketMaxEv,
      ),
    [displaySmoothed, maxCount, bucketMinEv, bucketMaxEv],
  );

  const areaPath = useMemo(
    () => densityAreaPath(curvePts, bucketMinEv, bucketMaxEv),
    [curvePts, bucketMinEv, bucketMaxEv],
  );

  const strokePath = useMemo(() => densityStrokePath(curvePts), [curvePts]);

  const tailFadeEv = useMemo(
    () =>
      tailFadeStartEv(
        smoothed,
        maxCount,
        bucketMinEv,
        bucketMaxEv,
        0.06,
      ),
    [smoothed, maxCount, bucketMinEv, bucketMaxEv],
  );

  const tailFadeX = useMemo(
    () => evToX(tailFadeEv, bucketMinEv, bucketMaxEv),
    [tailFadeEv, bucketMinEv, bucketMaxEv],
  );

  const selectionBand = useMemo(() => {
    const selected = edgesInCatalog.filter((e) => selectedSet.has(e.id));
    if (selected.length === 0) return null;
    const minEvs = selected
      .map((e) => e.minEv)
      .filter((v): v is number => v !== null);
    const maxEvs = selected
      .map((e) => e.maxEv)
      .filter((v): v is number => v !== null);
    if (minEvs.length === 0) return null;
    return { minEv: Math.min(...minEvs), maxEv: Math.max(...maxEvs) };
  }, [edgesInCatalog, selectedSet]);

  const markers = useMemo(() => {
    return edgesInCatalog
      .filter((e) => e.minEv !== null && e.maxEv !== null)
      .map((e) => {
        const minEv = e.minEv ?? 0;
        const maxEv = e.maxEv ?? 0;
        return {
          id: e.id,
          label: `${e.targetatom} ${e.corestate}`,
          repEv: representativeEvForEdge(
            minEv,
            maxEv,
            smoothed,
            bucketMinEv,
            bucketMaxEv,
          ),
          isSelected: selectedSet.has(e.id),
        };
      })
      .filter((m) => m.repEv >= bucketMinEv && m.repEv <= bucketMaxEv)
      .sort((a, b) => a.repEv - b.repEv);
  }, [edgesInCatalog, selectedSet, bucketMinEv, bucketMaxEv, smoothed]);

  const markerLabelLayouts = useMemo(() => {
    const withX = markers.map((m) => ({
      id: m.id,
      lineX: evToX(m.repEv, bucketMinEv, bucketMaxEv),
      label: m.label,
    }));
    return new Map(
      layoutMarkerLabels(withX).map((layout) => [layout.id, layout]),
    );
  }, [markers, bucketMinEv, bucketMaxEv]);

  const xTicks = useMemo(() => {
    const ticks: Array<{ ev: number; x: number }> = [];
    const step = 100;
    for (
      let ev = Math.ceil(bucketMinEv / step) * step;
      ev <= bucketMaxEv;
      ev += step
    ) {
      ticks.push({ ev, x: evToX(ev, bucketMinEv, bucketMaxEv) });
    }
    return ticks;
  }, [bucketMinEv, bucketMaxEv]);

  const yBase = PLOT_TOP + PLOT_H;
  const plotXEnd = CHART_W - PAD_R;

  return (
    <svg
      viewBox={`0 0 ${CHART_W} ${CHART_H}`}
      className="text-foreground h-[56px] w-full"
      preserveAspectRatio="xMidYMid meet"
      aria-label={`Edge photon energy distribution, ${bucketMinEv} to ${bucketMaxEv} eV`}
      role="img"
    >
      <defs>
        <linearGradient
          id={fillYId}
          x1="0"
          y1={PLOT_TOP}
          x2="0"
          y2={yBase}
          gradientUnits="userSpaceOnUse"
        >
          <stop
            offset="0%"
            stopColor="var(--accent)"
            stopOpacity="0.14"
          />
          <stop
            offset="100%"
            stopColor="var(--accent)"
            stopOpacity="0.04"
          />
        </linearGradient>
        <linearGradient
          id={fillXId}
          x1={PAD_L}
          y1="0"
          x2={plotXEnd}
          y2="0"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="white" stopOpacity="1" />
          <stop
            offset={`${Math.min(100, Math.max(0, ((tailFadeX - PAD_L) / PLOT_W) * 100)).toFixed(1)}%`}
            stopColor="white"
            stopOpacity="1"
          />
          <stop offset="100%" stopColor="white" stopOpacity="0.35" />
        </linearGradient>
        <mask id={tailMaskId}>
          <rect
            x={PAD_L}
            y={PLOT_TOP}
            width={PLOT_W}
            height={PLOT_H}
            fill={`url(#${fillXId})`}
          />
        </mask>
      </defs>

      {xTicks.map(({ ev, x }) => (
        <line
          key={`grid-${ev}`}
          x1={x.toFixed(1)}
          y1={PLOT_TOP}
          x2={x.toFixed(1)}
          y2={yBase.toFixed(1)}
          stroke="var(--border)"
          strokeOpacity="0.55"
          strokeWidth="0.75"
        />
      ))}

      {selectionBand !== null ? (
        <rect
          x={evToX(selectionBand.minEv, bucketMinEv, bucketMaxEv).toFixed(1)}
          y={PLOT_TOP}
          width={Math.max(
            1,
            evToX(selectionBand.maxEv, bucketMinEv, bucketMaxEv) -
              evToX(selectionBand.minEv, bucketMinEv, bucketMaxEv),
          ).toFixed(1)}
          height={PLOT_H}
          fill="var(--accent)"
          fillOpacity="0.1"
        />
      ) : null}

      {areaPath ? (
        <path
          d={areaPath}
          fill={`url(#${fillYId})`}
          mask={`url(#${tailMaskId})`}
        />
      ) : null}

      {strokePath ? (
        <path
          d={strokePath}
          fill="none"
          stroke="var(--accent)"
          strokeOpacity="0.55"
          strokeWidth="1.25"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : null}

      {markers.map((m) => {
        const lineX = evToX(m.repEv, bucketMinEv, bucketMaxEv);
        const labelLayout = markerLabelLayouts.get(m.id);
        const labelX = labelLayout?.labelX ?? lineX;
        const labelY = labelLayout?.labelY ?? 4;
        const textAnchor = labelLayout?.textAnchor ?? "middle";
        const labelUpper = m.label.toUpperCase();
        const approxWidth = labelUpper.length * 3.6 + 4;
        const badgeX =
          textAnchor === "start"
            ? labelX
            : textAnchor === "end"
              ? labelX - approxWidth
              : labelX - approxWidth / 2;

        return (
          <g key={m.id}>
            <line
              x1={lineX.toFixed(1)}
              y1={PLOT_TOP}
              x2={lineX.toFixed(1)}
              y2={yBase.toFixed(1)}
              stroke={m.isSelected ? "var(--accent)" : "var(--border)"}
              strokeOpacity={m.isSelected ? 0.85 : 0.9}
              strokeWidth={m.isSelected ? "1.25" : "1"}
              strokeDasharray={m.isSelected ? "none" : "2.5 2"}
            />
            <rect
              x={badgeX.toFixed(1)}
              y="0.5"
              width={approxWidth.toFixed(1)}
              height="8.5"
              rx="2"
              fill={
                m.isSelected
                  ? "color-mix(in oklch, var(--accent) 18%, transparent)"
                  : "color-mix(in oklch, var(--foreground) 6%, transparent)"
              }
              stroke={
                m.isSelected
                  ? "color-mix(in oklch, var(--accent) 35%, transparent)"
                  : "var(--border)"
              }
              strokeWidth="0.5"
              strokeOpacity={m.isSelected ? 1 : 0.7}
            />
            <text
              x={labelX.toFixed(1)}
              y={labelY.toFixed(1)}
              textAnchor={textAnchor}
              fontSize="6"
              fontFamily="inherit"
              fill={m.isSelected ? "var(--accent)" : "var(--foreground)"}
              fillOpacity={m.isSelected ? 1 : 0.82}
              fontWeight={m.isSelected ? "600" : "500"}
              style={{ letterSpacing: "0.06em" }}
            >
              {labelUpper}
            </text>
          </g>
        );
      })}

      <line
        x1={PAD_L}
        y1={yBase}
        x2={plotXEnd}
        y2={yBase}
        stroke="var(--border)"
        strokeWidth="0.75"
      />

      {xTicks.map(({ ev, x }) => (
        <g key={ev}>
          <line
            x1={x.toFixed(1)}
            y1={yBase}
            x2={x.toFixed(1)}
            y2={(yBase + 2.5).toFixed(1)}
            stroke="var(--muted)"
            strokeOpacity="0.65"
            strokeWidth="0.75"
          />
          <text
            x={x.toFixed(1)}
            y={(yBase + 7.5).toFixed(1)}
            textAnchor="middle"
            fontSize="6.5"
            fontFamily="inherit"
            fill="var(--muted)"
            fillOpacity="0.9"
          >
            {ev}
          </text>
        </g>
      ))}

      <text
        x={(CHART_W / 2).toFixed(1)}
        y={(CHART_H - 0.5).toFixed(1)}
        textAnchor="middle"
        fontSize="5.5"
        fontFamily="inherit"
        fill="var(--muted)"
        fillOpacity="0.75"
      >
        photon energy (eV)
      </text>
    </svg>
  );
}

/** Skeleton placeholder shown while catalog stats are loading. */
export function EdgeEnergyDensityChartSkeleton() {
  return (
    <div
      className="border-border/60 bg-muted/15 h-[56px] w-full animate-pulse rounded-md border"
      aria-label="Loading energy distribution"
      role="img"
    />
  );
}
