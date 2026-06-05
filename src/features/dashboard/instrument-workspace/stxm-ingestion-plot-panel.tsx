"use client";

import { useMemo, useState } from "react";
import { Spinner } from "@heroui/react";
import type { StxmIngestionResult } from "~/features/dashboard/lib/computeStxmIngestion";
import { buildStxmSpectrumPlotModel } from "~/features/dashboard/lib/stxm-to-spectrum-plot";
import type { ReferenceCurve } from "~/components/plots/types";
import { SpectrumPlot } from "~/components/plots/spectrum-plot";
import type { CursorMode } from "~/components/plots/spectrum/ModeBar";
import type { StxmRegionSpectrumSeries } from "~/lib/stxm/stxm-region-types";
import type { StxmIngestionPlotChannel } from "~/lib/stxm/stxm-ingestion-display";
import { StxmIngestionPlotDataRail } from "./stxm-ingestion-plot-data-rail";
import { StxmIngestionPlotHeader } from "./stxm-ingestion-plot-header";
import type { StxmWeightingMode } from "~/lib/stxm/estimators";
import type { StxmPlotScaleMode } from "~/lib/stxm/stxm-region-types";

/** SVG height for the ingestion spectrum plot; keep aligned with the region heatmap canvas. */
export const STXM_INGESTION_SPECTRUM_HEIGHT_PX = 600;

export type StxmPlotStandardOverlay = {
  id: string;
  label: string;
  energyEv: number[];
  values: number[];
  color: string;
  enabled: boolean;
};

type StxmIngestionPlotPanelProps = {
  result: StxmIngestionResult | null;
  regionSpectra: StxmRegionSpectrumSeries[];
  channel: StxmIngestionPlotChannel;
  onChannelChange: (channel: StxmIngestionPlotChannel) => void;
  yScale: "linear" | "log";
  onYScaleChange: (scale: StxmPlotScaleMode) => void;
  weightingMode: StxmWeightingMode;
  onWeightingModeChange: (mode: StxmWeightingMode) => void;
  standards: StxmPlotStandardOverlay[];
  bareAtomCurve: ReferenceCurve | null;
  showRegionOverlays: boolean;
  height?: number;
  isComputing?: boolean;
  primaryTraceLabel?: string;
  pureRegionLabel?: string;
};

function plotHasDisplayableData(
  result: StxmIngestionResult | null,
  regionSpectra: StxmRegionSpectrumSeries[],
): boolean {
  if (result && result.energyEv.length > 0) {
    return true;
  }
  return regionSpectra.length > 0;
}

function PlotComputingOverlay() {
  return (
    <div
      className="bg-surface/60 pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-md backdrop-blur-[1px]"
      aria-live="polite"
      aria-busy="true"
    >
      <Spinner size="md" aria-label="Computing spectra" />
    </div>
  );
}

/**
 * STXM ingestion spectrum card using the shared NEXAFS `SpectrumPlot` stack (header toggles, in-plot rails, legend).
 */
export function StxmIngestionPlotPanel({
  result,
  regionSpectra,
  channel,
  onChannelChange,
  yScale,
  onYScaleChange,
  weightingMode,
  onWeightingModeChange,
  standards,
  bareAtomCurve,
  showRegionOverlays,
  height = STXM_INGESTION_SPECTRUM_HEIGHT_PX,
  isComputing = false,
  primaryTraceLabel,
  pureRegionLabel,
}: StxmIngestionPlotPanelProps) {
  const [cursorMode, setCursorMode] = useState<CursorMode>("inspect");
  const hasRawSpectra = regionSpectra.length > 0;
  const hasReducedResult = result !== null;

  const plotModel = useMemo(
    () =>
      buildStxmSpectrumPlotModel({
        result,
        regionSpectra,
        channel,
        yScale,
        standards,
        bareAtomCurve,
        showRegionOverlays,
        primaryTraceLabel,
        pureRegionLabel,
      }),
    [
      bareAtomCurve,
      channel,
      primaryTraceLabel,
      pureRegionLabel,
      regionSpectra,
      result,
      showRegionOverlays,
      standards,
      yScale,
    ],
  );

  const plotLeftRail = useMemo(
    () => (
      <div className="pointer-events-auto flex flex-col items-center">
        <StxmIngestionPlotDataRail
          displayChannel={channel}
          onDisplayChannelChange={onChannelChange}
          hasRawSpectra={hasRawSpectra}
          hasReducedResult={hasReducedResult}
        />
      </div>
    ),
    [
      channel,
      hasRawSpectra,
      hasReducedResult,
      onChannelChange,
    ],
  );

  const showComputingOverlay =
    isComputing && !plotHasDisplayableData(result, regionSpectra);

  return (
    <div className="border-border bg-surface flex h-[min(70vh,640px)] min-h-[560px] min-w-0 flex-col gap-3 overflow-hidden rounded-xl border p-4 shadow-sm">
      <StxmIngestionPlotHeader
        displayChannel={channel}
        weightingMode={weightingMode}
        onWeightingModeChange={onWeightingModeChange}
        plotScaleMode={yScale}
        onPlotScaleModeChange={onYScaleChange}
      />

      <div className="relative flex min-h-0 min-w-0 flex-1 flex-col rounded-xl border border-[var(--border-default)] p-4">
        {plotModel ? (
          <SpectrumPlot
            points={plotModel.points}
            height={height}
            graphStyle="line"
            yAxisQuantity={plotModel.yAxisQuantity}
            referenceCurves={plotModel.referenceCurves}
            companionSpectra={plotModel.companionSpectra}
            showNormalizationShading={plotModel.showNormalizationShading}
            normalizationRegions={plotModel.normalizationRegions}
            primaryTraceLabel={plotModel.primaryTraceLabel}
            headerRight={plotLeftRail}
            suppressAnalysisRailLeadingGrip
            cursorMode={cursorMode}
            onCursorModeChange={setCursorMode}
            emptyStateMessage="Computing spectra for this channel."
          />
        ) : (
          <div
            className="border-border bg-default/20 flex flex-1 items-center justify-center rounded-md border"
            style={{ minHeight: height }}
          >
            {showComputingOverlay ? (
              <Spinner size="md" aria-label="Computing spectra" />
            ) : (
              <p className="text-muted px-4 text-center text-sm">
                Configure sample and izero regions to compute spectra.
              </p>
            )}
          </div>
        )}
        {showComputingOverlay && plotModel ? <PlotComputingOverlay /> : null}
      </div>
    </div>
  );
}
