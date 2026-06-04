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

import { useMemo } from "react";

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
const CHART_H = 96;
const PAD_L = 8;
const PAD_R = 8;
const PAD_T = 22;
const PAD_B = 26;
const PLOT_W = CHART_W - PAD_L - PAD_R;
const PLOT_H = CHART_H - PAD_T - PAD_B;

function evToX(ev: number, minEv: number, maxEv: number): number {
  return PAD_L + ((ev - minEv) / (maxEv - minEv)) * PLOT_W;
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
function densityAreaPath(
  smoothed: number[],
  maxCount: number,
  minEv: number,
  maxEv: number,
): string {
  const n = smoothed.length;
  if (n === 0 || maxCount === 0) return "";
  const binWidth = (maxEv - minEv) / n;
  const yBase = PAD_T + PLOT_H;

  const pts = smoothed.map((count, i) => {
    const ev = minEv + (i + 0.5) * binWidth;
    const x = evToX(ev, minEv, maxEv);
    const norm = count / maxCount;
    const y = PAD_T + PLOT_H * (1 - norm);
    return [x.toFixed(1), y.toFixed(1)] as const;
  });

  const xStart = evToX(minEv, minEv, maxEv).toFixed(1);
  const xEnd = evToX(maxEv, minEv, maxEv).toFixed(1);
  const yBaseStr = yBase.toFixed(1);

  return [
    `M ${xStart},${yBaseStr}`,
    ...pts.map(([x, y]) => `L ${x},${y}`),
    `L ${xEnd},${yBaseStr}`,
    "Z",
  ].join(" ");
}

/**
 * Renders a compact SVG energy density chart for the NEXAFS periodic edge
 * picker modal.
 *
 * The chart shows a filled area of spectrum-point energy distribution, a
 * semi-transparent accent band over the energy range of currently selected
 * edges, dashed vertical markers at each edge's representative energy with
 * staggered labels, and x-axis tick marks at 100 eV intervals.
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
  const { bucketMinEv, bucketMaxEv, buckets } = energyHistogram;
  const selectedSet = useMemo(() => new Set(selectedEdgeIds), [selectedEdgeIds]);

  const smoothed = useMemo(() => smoothBuckets(buckets), [buckets]);
  const maxCount = useMemo(() => Math.max(...smoothed, 1), [smoothed]);

  const areaPath = useMemo(
    () => densityAreaPath(smoothed, maxCount, bucketMinEv, bucketMaxEv),
    [smoothed, maxCount, bucketMinEv, bucketMaxEv],
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
      .map((e) => ({
        id: e.id,
        label: `${e.targetatom} ${e.corestate}`,
        repEv: ((e.minEv ?? 0) + (e.maxEv ?? 0)) / 2,
        isSelected: selectedSet.has(e.id),
      }))
      .filter((m) => m.repEv >= bucketMinEv && m.repEv <= bucketMaxEv)
      .sort((a, b) => a.repEv - b.repEv);
  }, [edgesInCatalog, selectedSet, bucketMinEv, bucketMaxEv]);

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

  const yBase = PAD_T + PLOT_H;

  return (
    <svg
      viewBox={`0 0 ${CHART_W} ${CHART_H}`}
      className="w-full"
      style={{ height: "auto", display: "block" }}
      aria-label={`Edge photon energy distribution, ${bucketMinEv} to ${bucketMaxEv} eV`}
      role="img"
    >
      {/* density area */}
      <path
        d={areaPath}
        style={{
          fill: "color-mix(in oklch, var(--color-accent, var(--accent)) 14%, transparent)",
          stroke: "color-mix(in oklch, var(--color-accent, var(--accent)) 40%, transparent)",
        }}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />

      {/* selection band */}
      {selectionBand !== null ? (
        <rect
          x={evToX(selectionBand.minEv, bucketMinEv, bucketMaxEv).toFixed(1)}
          y={PAD_T}
          width={Math.max(
            1,
            evToX(selectionBand.maxEv, bucketMinEv, bucketMaxEv) -
              evToX(selectionBand.minEv, bucketMinEv, bucketMaxEv),
          ).toFixed(1)}
          height={PLOT_H}
          style={{
            fill: "color-mix(in oklch, var(--color-accent, var(--accent)) 22%, transparent)",
          }}
        />
      ) : null}

      {/* edge markers: dashed vertical lines + staggered labels */}
      {markers.map((m, idx) => {
        const x = evToX(m.repEv, bucketMinEv, bucketMaxEv);
        const labelY = idx % 2 === 0 ? 9 : 17;
        const lineColor = m.isSelected
          ? "color-mix(in oklch, var(--color-accent, var(--accent)) 80%, transparent)"
          : "color-mix(in oklch, var(--foreground, currentColor) 25%, transparent)";
        const textColor = m.isSelected
          ? "color-mix(in oklch, var(--color-accent, var(--accent)) 90%, transparent)"
          : "color-mix(in oklch, var(--foreground, currentColor) 55%, transparent)";
        return (
          <g key={m.id}>
            <line
              x1={x.toFixed(1)}
              y1={PAD_T}
              x2={x.toFixed(1)}
              y2={yBase.toFixed(1)}
              stroke={lineColor}
              strokeWidth={m.isSelected ? "1.5" : "1"}
              strokeDasharray="3,2"
            />
            <text
              x={x.toFixed(1)}
              y={labelY}
              textAnchor="middle"
              fontSize="7.5"
              fontFamily="inherit"
              fill={textColor}
              fontWeight={m.isSelected ? "600" : "400"}
            >
              {m.label}
            </text>
          </g>
        );
      })}

      {/* baseline */}
      <line
        x1={PAD_L}
        y1={yBase}
        x2={CHART_W - PAD_R}
        y2={yBase}
        stroke="color-mix(in oklch, var(--foreground, currentColor) 15%, transparent)"
        strokeWidth="1"
      />

      {/* x-axis ticks and labels */}
      {xTicks.map(({ ev, x }) => (
        <g key={ev}>
          <line
            x1={x.toFixed(1)}
            y1={yBase}
            x2={x.toFixed(1)}
            y2={(yBase + 4).toFixed(1)}
            stroke="color-mix(in oklch, var(--foreground, currentColor) 20%, transparent)"
            strokeWidth="1"
          />
          <text
            x={x.toFixed(1)}
            y={(yBase + 13).toFixed(1)}
            textAnchor="middle"
            fontSize="9"
            fontFamily="inherit"
            fill="color-mix(in oklch, var(--foreground, currentColor) 45%, transparent)"
          >
            {ev}
          </text>
        </g>
      ))}

      {/* x-axis unit label */}
      <text
        x={(CHART_W / 2).toFixed(1)}
        y={(CHART_H - 2).toFixed(1)}
        textAnchor="middle"
        fontSize="8"
        fontFamily="inherit"
        fill="color-mix(in oklch, var(--foreground, currentColor) 35%, transparent)"
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
      className="bg-default/40 animate-pulse rounded"
      style={{ height: 72 }}
      aria-label="Loading energy distribution"
      role="img"
    />
  );
}
