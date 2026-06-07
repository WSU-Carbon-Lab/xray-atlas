"use client";

import { useMemo } from "react";
import { LegendSwatch } from "~/components/plots/spectrum/LegendSwatch";
import { SpectrumPlot } from "~/components/plots/spectrum-plot";
import type { CursorMode } from "~/components/plots/spectrum/ModeBar";
import type {
  AxisStats,
  DifferenceSpectrum,
  SpectrumPoint,
  SpectrumYAxisQuantity,
} from "~/components/plots/types";
import type { PlotViewerSubplotPanel } from "./plot-viewer-subplot-partition";
import type { PlotViewerStyledTrace } from "./plot-viewer-styled-traces";

type MappedSubplotTraces = {
  points: SpectrumPoint[];
  primary: PlotViewerStyledTrace | undefined;
  companions: DifferenceSpectrum[];
};

function tracesToCompanionSpectra(
  traces: readonly PlotViewerStyledTrace[],
): MappedSubplotTraces {
  if (traces.length === 0) {
    return { points: [], primary: undefined, companions: [] };
  }
  const [primary, ...rest] = traces;
  if (primary == null) {
    return { points: [], primary: undefined, companions: [] };
  }
  return {
    points: primary.points,
    primary,
    companions: rest.map((trace) => ({
      label: trace.label,
      preferred: false,
      points: trace.points,
      color: trace.color,
      lineDash: trace.lineDash,
      lineWidth: trace.lineWidth,
      markerSymbol: trace.markerSymbol,
      markerEvery: trace.markerEvery,
      markerSize: trace.markerSize,
      legendId: trace.legendId,
      regionSpotLabel: trace.descriptors.molecule,
    })),
  };
}

function swatchVariant(lineDash: PlotViewerStyledTrace["lineDash"]): "solid" | "dash" {
  return lineDash === "solid" ? "solid" : "dash";
}

function energyStatsForTraces(
  traces: readonly PlotViewerStyledTrace[],
): AxisStats {
  let min: number | null = null;
  let max: number | null = null;
  for (const trace of traces) {
    for (const point of trace.points) {
      if (!Number.isFinite(point.energy)) {
        continue;
      }
      min = min == null ? point.energy : Math.min(min, point.energy);
      max = max == null ? point.energy : Math.max(max, point.energy);
    }
  }
  return { min, max };
}

export type PlotViewerSubplotGridProps = {
  panels: readonly PlotViewerSubplotPanel[];
  yAxisQuantity: SpectrumYAxisQuantity;
  channelGlyph: string;
  sharedEnergyStats: AxisStats;
  cursorMode: CursorMode;
  onCursorModeChange: (mode: CursorMode) => void;
  emptyStateMessage: string;
};

/**
 * Renders one small-multiples grid panel per incident-angle geometry with datasets overlaid.
 */
export function PlotViewerSubplotGrid({
  panels,
  yAxisQuantity,
  channelGlyph,
  sharedEnergyStats,
  cursorMode,
  onCursorModeChange,
  emptyStateMessage,
}: PlotViewerSubplotGridProps) {
  const panelEnergyStats = useMemo(
    () => energyStatsForTraces(panels.flatMap((panel) => panel.traces)),
    [panels],
  );
  const energyStats =
    sharedEnergyStats.min != null && sharedEnergyStats.max != null
      ? sharedEnergyStats
      : panelEnergyStats;

  if (panels.length === 0) {
    return (
      <div className="border-border bg-default/20 text-muted flex min-h-[420px] flex-1 items-center justify-center rounded-lg border border-dashed px-6 text-center text-sm">
        {emptyStateMessage}
      </div>
    );
  }

  return (
    <div className="grid min-h-0 flex-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {panels.map((panel) => {
        const mapped = tracesToCompanionSpectra(panel.traces);
        if (mapped.primary == null) {
          return null;
        }
        return (
          <div
            key={panel.geometryKey}
            className="border-border bg-default/10 flex min-h-[280px] min-w-0 flex-col rounded-lg border"
          >
            <div className="border-border border-b px-3 py-2">
              <p className="text-foreground text-sm font-medium">{panel.angleLabel}</p>
              <p className="text-muted text-xs">
                {panel.traces.length} dataset
                {panel.traces.length === 1 ? "" : "s"}
              </p>
              <ul
                className="mt-2 flex flex-wrap gap-x-3 gap-y-1"
                aria-label={`Legend for ${panel.angleLabel}`}
              >
                {panel.traces.map((trace) => (
                  <li
                    key={trace.traceKey}
                    className="text-foreground inline-flex min-w-0 max-w-full items-center gap-1.5 text-[11px]"
                  >
                    <LegendSwatch
                      color={trace.color}
                      variant={swatchVariant(trace.lineDash)}
                      graphStyle="line"
                    />
                    <span className="truncate">{trace.descriptors.molecule}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="min-h-[240px] min-w-0 flex-1 p-1">
              <SpectrumPlot
                points={mapped.points}
                yAxisQuantity={yAxisQuantity}
                companionSpectra={mapped.companions}
                primaryTraceLabel={mapped.primary.label}
                primaryTraceColor={mapped.primary.color}
                primaryTraceLineDash={mapped.primary.lineDash}
                primaryTraceLineWidth={mapped.primary.lineWidth}
                primaryTraceMarkerSymbol={
                  mapped.primary.markerSymbol === "none"
                    ? undefined
                    : mapped.primary.markerSymbol
                }
                primaryTraceMarkerEvery={mapped.primary.markerEvery}
                primaryTraceMarkerSize={mapped.primary.markerSize}
                hideGeometryLegend
                suppressInPlotLegend
                channelLegendGlyph={channelGlyph}
                energyStats={energyStats}
                cursorMode={cursorMode}
                onCursorModeChange={onCursorModeChange}
                plotContext={{ kind: "explore" }}
                suppressAnalysisRailLeadingGrip
                height={240}
                emptyStateMessage={emptyStateMessage}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
