"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTheme } from "next-themes";
import { Spinner } from "@heroui/react";
import type { StxmIngestionResult } from "~/features/dashboard/lib/computeStxmIngestion";
import { buildStxmSpectrumPlotModel } from "~/features/dashboard/lib/stxm-to-spectrum-plot";
import type { ReferenceCurve } from "~/components/plots/types";
import { SpectrumPlot } from "~/components/plots/spectrum-plot";
import type { CursorMode } from "~/components/plots/spectrum/ModeBar";
import {
  DatasetVisualizationShell,
  type GraphStyle,
  type VisualizationMode,
} from "~/features/process-nexafs/ui/dataset-visualization-shell";
import type { StxmRegionSpectrumSeries } from "~/lib/stxm/stxm-region-types";
import {
  ingestionChannelUsesRawSignal,
  stxmSignalChannelForI0PlotScale,
  type StxmI0PlotScaleMode,
  type StxmIngestionPlotChannel,
} from "~/lib/stxm/stxm-ingestion-display";
import {
  buildStxmBareAtomReferenceCurve,
  stxmBareAtomOverlaySupportedForChannel,
} from "~/features/dashboard/lib/stxm-bare-atom-overlay";
import type { StxmWeightingMode } from "~/lib/stxm/estimators";
import { StxmIngestionPlotDataRail } from "./stxm-ingestion-plot-data-rail";
import { StxmIngestionSpectrumTable } from "./stxm-ingestion-spectrum-table";
import { StxmIngestionWeightingToolbar } from "./stxm-ingestion-weighting-toolbar";

/** SVG height for the ingestion spectrum plot; keep aligned with the region heatmap canvas. */
export const STXM_INGESTION_SPECTRUM_HEIGHT_PX = 600;

const STXM_VISUALIZATION_MODES: VisualizationMode[] = ["graph", "table"];

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
  i0PlotScale: StxmI0PlotScaleMode;
  onI0PlotScaleChange: (mode: StxmI0PlotScaleMode) => void;
  weightingMode: StxmWeightingMode;
  onWeightingModeChange: (mode: StxmWeightingMode) => void;
  standards: StxmPlotStandardOverlay[];
  chemicalFormula: string | null;
  formulaLoading?: boolean;
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
 * STXM ingestion spectrum card with NEXAFS-style Graph/Table shell and in-plot data rails.
 */
export function StxmIngestionPlotPanel({
  result,
  regionSpectra,
  channel,
  onChannelChange,
  i0PlotScale,
  onI0PlotScaleChange,
  weightingMode,
  onWeightingModeChange,
  standards,
  chemicalFormula,
  formulaLoading = false,
  showRegionOverlays,
  height = STXM_INGESTION_SPECTRUM_HEIGHT_PX,
  isComputing = false,
  primaryTraceLabel,
  pureRegionLabel,
}: StxmIngestionPlotPanelProps) {
  const { resolvedTheme } = useTheme();
  const [cursorMode, setCursorMode] = useState<CursorMode>("inspect");
  const [visualizationMode, setVisualizationMode] =
    useState<VisualizationMode>("graph");
  const [graphStyle, setGraphStyle] = useState<GraphStyle>("line");
  const [showBareAtomOverlay, setShowBareAtomOverlay] = useState(false);
  const [bareAtomCurve, setBareAtomCurve] = useState<ReferenceCurve | null>(null);

  const hasRawSpectra = regionSpectra.length > 0;
  const hasReducedResult = result !== null;
  const energyEv = result?.energyEv ?? regionSpectra[0]?.energyEv ?? [];

  const bareAtomOverlayDisabled =
    !chemicalFormula || !stxmBareAtomOverlaySupportedForChannel(channel);
  const bareAtomOverlayDisabledReason = !chemicalFormula
    ? "Link a molecule with a chemical formula first."
    : !stxmBareAtomOverlaySupportedForChannel(channel)
      ? "Switch to mass absorption or an optical-constant view for bare atom."
      : "Bare-atom overlay is not available in this view.";

  useEffect(() => {
    if (!showBareAtomOverlay || !chemicalFormula || energyEv.length < 2) {
      setBareAtomCurve(null);
      return;
    }
    if (!stxmBareAtomOverlaySupportedForChannel(channel)) {
      setBareAtomCurve(null);
      return;
    }
    let cancelled = false;
    void buildStxmBareAtomReferenceCurve({
      chemicalFormula,
      energyEv,
      plotChannel: channel,
      isDark: resolvedTheme === "dark",
    }).then((curve) => {
      if (!cancelled) {
        setBareAtomCurve(curve);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [
    channel,
    chemicalFormula,
    energyEv,
    resolvedTheme,
    showBareAtomOverlay,
  ]);

  useEffect(() => {
    if (!chemicalFormula) {
      setShowBareAtomOverlay(false);
    }
  }, [chemicalFormula]);

  const handleI0PlotScaleChange = useCallback(
    (mode: StxmI0PlotScaleMode) => {
      onI0PlotScaleChange(mode);
      if (ingestionChannelUsesRawSignal(channel)) {
        onChannelChange(stxmSignalChannelForI0PlotScale(mode, channel));
      }
    },
    [channel, onChannelChange, onI0PlotScaleChange],
  );

  const plotModel = useMemo(
    () =>
      buildStxmSpectrumPlotModel({
        result,
        regionSpectra,
        channel,
        i0PlotScale,
        standards,
        bareAtomCurve,
        showBareAtomOverlay,
        showRegionOverlays,
        primaryTraceLabel,
        pureRegionLabel,
      }),
    [
      bareAtomCurve,
      channel,
      i0PlotScale,
      primaryTraceLabel,
      pureRegionLabel,
      regionSpectra,
      result,
      showBareAtomOverlay,
      showRegionOverlays,
      standards,
    ],
  );

  const plotLeftRail = useMemo(
    () => (
      <StxmIngestionPlotDataRail
        displayChannel={channel}
        onDisplayChannelChange={onChannelChange}
        hasRawSpectra={hasRawSpectra}
        hasReducedResult={hasReducedResult}
        i0PlotScale={i0PlotScale}
        onI0PlotScaleChange={handleI0PlotScaleChange}
        showBareAtomOverlay={showBareAtomOverlay}
        onShowBareAtomOverlayChange={setShowBareAtomOverlay}
        bareAtomOverlayDisabled={bareAtomOverlayDisabled}
        bareAtomOverlayDisabledReason={bareAtomOverlayDisabledReason}
        formulaLoading={formulaLoading}
      />
    ),
    [
      bareAtomOverlayDisabled,
      bareAtomOverlayDisabledReason,
      channel,
      formulaLoading,
      handleI0PlotScaleChange,
      hasRawSpectra,
      hasReducedResult,
      i0PlotScale,
      onChannelChange,
      showBareAtomOverlay,
    ],
  );

  const showComputingOverlay =
    isComputing && !plotHasDisplayableData(result, regionSpectra);

  const graphContent = (
    <div className="relative flex min-h-0 min-w-0 flex-1 flex-col rounded-xl border border-[var(--border-default)] p-4">
      {plotModel ? (
        <SpectrumPlot
          points={plotModel.points}
          height={height}
          graphStyle={graphStyle}
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
  );

  return (
    <div className="border-border bg-surface flex h-[min(70vh,640px)] min-h-[560px] min-w-0 flex-col gap-3 overflow-hidden rounded-xl border p-4 shadow-sm">
      <DatasetVisualizationShell
        modes={STXM_VISUALIZATION_MODES}
        mode={visualizationMode}
        onModeChange={setVisualizationMode}
        graphStyle={graphStyle}
        onGraphStyleChange={setGraphStyle}
        leadingSlot={
          <StxmIngestionWeightingToolbar
            weightingMode={weightingMode}
            onWeightingModeChange={onWeightingModeChange}
          />
        }
        graph={graphContent}
        table={
          <StxmIngestionSpectrumTable
            result={result}
            regionSpectra={regionSpectra}
          />
        }
      />
    </div>
  );
}
