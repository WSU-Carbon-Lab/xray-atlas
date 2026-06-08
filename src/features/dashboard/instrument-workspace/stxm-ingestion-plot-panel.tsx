"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTheme } from "next-themes";
import { ErrorMessage, Spinner } from "@heroui/react";
import {
  defaultPlotChannelForTray,
  trayIdForChannel,
} from "~/components/plots/data-rail";
import type { StxmIngestionResult } from "~/features/dashboard/lib/computeStxmIngestion";
import { useStxmIngestionPlotState } from "~/features/dashboard/hooks/useStxmIngestionPlotState";
import type { StxmCompareOverlay } from "~/features/dashboard/lib/stxm-to-spectrum-plot";
import type {
  NormalizationRegionEdgeId,
  NormalizationRegions,
  Peak,
  ReferenceCurve,
} from "~/components/plots/types";
import { SpectrumPlot } from "~/components/plots/spectrum-plot";
import type { CursorMode } from "~/components/plots/spectrum/ModeBar";
import {
  DatasetVisualizationShell,
  type GraphStyle,
  type VisualizationMode,
} from "~/features/process-nexafs/ui/dataset-visualization-shell";
import type { StxmNormalizationWindows } from "~/lib/dashboard-processing-session";
import type {
  StxmIzeroBounds,
  StxmPlotScaleMode,
  StxmRegionSpectrumSeries,
  StxmSampleRegion,
} from "~/lib/stxm/stxm-region-types";
import type { StxmIngestionPlotChannel } from "~/lib/stxm/stxm-ingestion-display";
import {
  buildStxmChannelAvailabilityContext,
  canComputeStxmChannel,
  resolveStxmPlotEmptyState,
} from "~/lib/stxm/stxm-channel-availability";
import { STXM_INGESTION_PLOT_DATA_RAIL_DEFINITION } from "~/lib/stxm/stxm-ingestion-plot-data-rail-config";
import { stxmDerivedOpticalChannelsAvailable } from "~/lib/stxm/stxm-ingestion-display";
import type { StxmRawSignalTransformMode } from "~/lib/stxm/stxm-raw-signal-transform";
import {
  buildStxmBareAtomReferenceCurve,
  stxmBareAtomOverlaySupportedForChannel,
} from "~/features/dashboard/lib/stxm-bare-atom-overlay";
import { suggestNormalizationWindows } from "~/lib/stxm/normalization";
import { StxmIngestionPlotDataRail } from "./stxm-ingestion-plot-data-rail";
import { StxmIngestionAnalysisRail } from "./stxm-ingestion-analysis-rail";
import { StxmIngestionSpectrumTable } from "./stxm-ingestion-spectrum-table";
import {
  STXM_INGESTION_SPECTRUM_HEIGHT_PX,
  STXM_REGION_EDITOR_MAX_WIDTH_PX,
} from "./stxm-ingestion-layout";
import { StxmMultiRegionEditor } from "./stxm-multi-region-editor";
import { StxmRegionTrayToggle } from "./stxm-region-tray-toggle";
import type { RegionDragTarget } from "~/lib/stxm/region-editor-utils";

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
  rawSignalTransform: StxmRawSignalTransformMode;
  onRawSignalTransformChange: (mode: StxmRawSignalTransformMode) => void;
  isTeyExperiment: boolean;
  hasIeData: boolean;
  normalization: StxmNormalizationWindows;
  onNormalizationChange: (windows: StxmNormalizationWindows) => void;
  standards: StxmPlotStandardOverlay[];
  chemicalFormula: string | null;
  hasLinkedMolecule: boolean;
  formulaLoading?: boolean;
  showRegionOverlays: boolean;
  compareOverlays?: StxmCompareOverlay[];
  peaks: Peak[];
  onPeaksChange: (peaks: Peak[]) => void;
  height?: number;
  isComputing?: boolean;
  primaryTraceLabel?: string;
  pureRegionLabel?: string;
  regionSpectraEpoch?: number;
  pipelineEpoch?: number;
  /** Scope key (for example active scan id) that invalidates stale plot cache on switch. */
  plotScopeKey: string;
  imageMatrix: number[][];
  qaxisPoints: number[];
  regions: StxmSampleRegion[];
  izero: StxmIzeroBounds;
  imageScaleMode: StxmPlotScaleMode;
  onRegionsChange: (regions: StxmSampleRegion[]) => void;
  onRegionChange: (index: number, region: StxmSampleRegion) => void;
  onIzeroChange: (izero: StxmIzeroBounds) => void;
  onRegionDragStart: () => void;
  onRegionDragEnd: () => void;
  onNormalizationInteractionChange: (active: boolean) => void;
  onAutoSuggestRegions: () => void;
  regionTrayOpen: boolean;
  onRegionTrayOpenChange: (open: boolean) => void;
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

function stxmWindowsToPlotRegions(
  windows: StxmNormalizationWindows,
): NormalizationRegions {
  return {
    pre: [windows.preLo, windows.preHi],
    post: [windows.postLo, windows.postHi],
  };
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

function StxmPlotChannelEmptyState({
  title,
  detail,
  actionLabel,
  height,
  emphasizeRequirement,
}: {
  title: string;
  detail: string;
  actionLabel?: string;
  height: number;
  emphasizeRequirement: boolean;
}) {
  return (
    <div
      className="border-border bg-default/20 flex flex-1 flex-col items-center justify-center gap-2 rounded-md border px-6 text-center"
      style={{ minHeight: height }}
      role="status"
    >
      <p className="text-foreground text-sm font-medium">{title}</p>
      {emphasizeRequirement ? (
        <ErrorMessage className="max-w-md text-sm">{detail}</ErrorMessage>
      ) : (
        <p className="text-muted max-w-md text-sm">{detail}</p>
      )}
      {actionLabel ? (
        <p className="text-accent text-xs font-medium">{actionLabel}</p>
      ) : null}
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
  rawSignalTransform,
  onRawSignalTransformChange,
  isTeyExperiment,
  hasIeData,
  normalization,
  onNormalizationChange,
  standards,
  chemicalFormula,
  hasLinkedMolecule,
  formulaLoading = false,
  showRegionOverlays,
  compareOverlays = [],
  peaks,
  onPeaksChange,
  height = STXM_INGESTION_SPECTRUM_HEIGHT_PX,
  isComputing = false,
  primaryTraceLabel,
  pureRegionLabel,
  regionSpectraEpoch = 0,
  pipelineEpoch = 0,
  plotScopeKey,
  imageMatrix,
  qaxisPoints,
  regions,
  izero,
  imageScaleMode,
  onRegionsChange,
  onRegionChange,
  onIzeroChange,
  onRegionDragStart,
  onRegionDragEnd,
  onNormalizationInteractionChange,
  onAutoSuggestRegions,
  regionTrayOpen,
  onRegionTrayOpenChange,
}: StxmIngestionPlotPanelProps) {
  const { resolvedTheme } = useTheme();
  const [cursorMode, setCursorMode] = useState<CursorMode>("inspect");
  const [visualizationMode, setVisualizationMode] =
    useState<VisualizationMode>("graph");
  const [graphStyle, setGraphStyle] = useState<GraphStyle>("line");
  const [showBareAtomOverlay, setShowBareAtomOverlay] = useState(false);
  const [bareAtomCurve, setBareAtomCurve] = useState<ReferenceCurve | null>(null);
  const [linkImaginaryReal, setLinkImaginaryReal] = useState(false);
  const [isPlotNormalizationMode, setIsPlotNormalizationMode] = useState(false);
  const [normalizationSelectionTarget, setNormalizationSelectionTarget] =
    useState<"pre" | "post">("pre");
  const [isPeakSetMode, setIsPeakSetMode] = useState(false);
  const [selectedPeakId, setSelectedPeakId] = useState<string | null>(null);

  const hasReducedResult = result !== null;
  const energyEv = result?.energyEv ?? regionSpectra[0]?.energyEv ?? [];
  const betaSeries =
    result?.beta ?? regionSpectra.find((series) => series.beta)?.beta;
  const deltaSeries =
    result?.delta ?? regionSpectra.find((series) => series.delta)?.delta;

  const derivedOpticalAvailable = useMemo(
    () =>
      stxmDerivedOpticalChannelsAvailable(
        energyEv,
        betaSeries,
        deltaSeries,
        chemicalFormula ?? result?.formula,
      ),
    [
      betaSeries,
      chemicalFormula,
      deltaSeries,
      energyEv,
      result?.formula,
    ],
  );

  const availabilityBase = useMemo(
    () => ({
      regionSpectra,
      hasReducedResult,
      hasLinkedMolecule,
      chemicalFormula,
      energyEv,
      beta: betaSeries,
      delta: deltaSeries,
      derivedOpticalAvailable,
      hasIeData,
      isTeyExperiment,
      configuredSampleRegionCount: regions.length,
      configuredIzero: izero != null,
    }),
    [
      betaSeries,
      chemicalFormula,
      deltaSeries,
      derivedOpticalAvailable,
      energyEv,
      hasIeData,
      hasLinkedMolecule,
      hasReducedResult,
      isTeyExperiment,
      izero,
      regionSpectra,
      regions.length,
    ],
  );

  const activeChannelContext = useMemo(
    () =>
      buildStxmChannelAvailabilityContext({
        ...availabilityBase,
        channel,
      }),
    [availabilityBase, channel],
  );

  const channelCanRender = canComputeStxmChannel(activeChannelContext);

  const plotEmptyState = useMemo(
    () => resolveStxmPlotEmptyState(activeChannelContext),
    [activeChannelContext],
  );

  const isChannelAvailableForRail = useCallback(
    (id: StxmIngestionPlotChannel) =>
      canComputeStxmChannel(
        buildStxmChannelAvailabilityContext({
          ...availabilityBase,
          channel: id,
        }),
      ),
    [availabilityBase],
  );

  useEffect(() => {
    if (channelCanRender) {
      return;
    }
    const hasSampleRegions = regionSpectra.some((series) => !series.isIzero);
    if (hasSampleRegions) {
      return;
    }
    const trayId = trayIdForChannel(
      STXM_INGESTION_PLOT_DATA_RAIL_DEFINITION,
      channel,
    );
    const trayFallback = defaultPlotChannelForTray(
      STXM_INGESTION_PLOT_DATA_RAIL_DEFINITION,
      trayId,
      isChannelAvailableForRail,
    );
    if (trayFallback != null && trayFallback !== channel) {
      onChannelChange(trayFallback);
      return;
    }
    for (const tray of STXM_INGESTION_PLOT_DATA_RAIL_DEFINITION.trays) {
      const next = defaultPlotChannelForTray(
        STXM_INGESTION_PLOT_DATA_RAIL_DEFINITION,
        tray.id,
        isChannelAvailableForRail,
      );
      if (next != null && next !== channel) {
        onChannelChange(next);
        return;
      }
    }
  }, [
    channel,
    channelCanRender,
    isChannelAvailableForRail,
    onChannelChange,
    regionSpectra,
  ]);

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

  const normalizationRegionsForPlot = useMemo(
    () => stxmWindowsToPlotRegions(normalization),
    [normalization],
  );

  const handleNormalizationEdgeEnergyChange = useCallback(
    (edge: NormalizationRegionEdgeId, energy: number) => {
      const rounded = Math.round(energy * 100) / 100;
      const sortPair = (a: number, b: number): [number, number] =>
        a <= b ? [a, b] : [b, a];
      if (edge === "preMin" || edge === "preMax") {
        const next =
          edge === "preMin"
            ? sortPair(rounded, normalization.preHi)
            : sortPair(normalization.preLo, rounded);
        onNormalizationChange({
          ...normalization,
          preLo: next[0],
          preHi: next[1],
        });
        return;
      }
      const next =
        edge === "postMin"
          ? sortPair(rounded, normalization.postHi)
          : sortPair(normalization.postLo, rounded);
      onNormalizationChange({
        ...normalization,
        postLo: next[0],
        postHi: next[1],
      });
    },
    [normalization, onNormalizationChange],
  );

  const handleResetNormalizationRegions = useCallback(() => {
    if (energyEv.length < 2) {
      return;
    }
    onNormalizationChange(
      suggestNormalizationWindows(Float64Array.from(energyEv)),
    );
  }, [energyEv, onNormalizationChange]);

  const { plotModel } = useStxmIngestionPlotState({
    result,
    regionSpectra,
    regions,
    channel,
    rawSignalTransform,
    standards,
    bareAtomCurve,
    showBareAtomOverlay,
    showRegionOverlays,
    linkImaginaryReal,
    compareOverlays,
    normalizationOverride: normalizationRegionsForPlot,
    primaryTraceLabel,
    pureRegionLabel,
    regionSpectraEpoch,
    pipelineEpoch,
    plotScopeKey,
  });

  const plotLeftRail = useMemo(
    () => (
      <StxmIngestionPlotDataRail
        displayChannel={channel}
        onDisplayChannelChange={onChannelChange}
        regionSpectra={regionSpectra}
        hasReducedResult={hasReducedResult}
        hasLinkedMolecule={hasLinkedMolecule}
        chemicalFormula={chemicalFormula}
        energyEv={energyEv}
        beta={betaSeries}
        delta={deltaSeries}
        derivedOpticalAvailable={derivedOpticalAvailable}
        rawSignalTransform={rawSignalTransform}
        onRawSignalTransformChange={onRawSignalTransformChange}
        isTeyExperiment={isTeyExperiment}
        hasIeData={hasIeData}
        linkImaginaryReal={linkImaginaryReal}
        onLinkImaginaryRealChange={setLinkImaginaryReal}
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
      betaSeries,
      channel,
      chemicalFormula,
      deltaSeries,
      derivedOpticalAvailable,
      energyEv,
      formulaLoading,
      hasIeData,
      hasLinkedMolecule,
      hasReducedResult,
      isTeyExperiment,
      linkImaginaryReal,
      onChannelChange,
      onRawSignalTransformChange,
      rawSignalTransform,
      regionSpectra,
      showBareAtomOverlay,
    ],
  );

  const plotAnalysisRail = useMemo(
    () => (
      <StxmIngestionAnalysisRail
        isNormalizationMode={isPlotNormalizationMode}
        onNormalizationModeChange={setIsPlotNormalizationMode}
        activeEdge={normalizationSelectionTarget}
        onActiveEdgeChange={setNormalizationSelectionTarget}
        onResetNormalizationRegions={handleResetNormalizationRegions}
        hasData={Boolean(plotModel?.points.length)}
        isPeakSetMode={isPeakSetMode}
        onPeakSetModeChange={setIsPeakSetMode}
        peakCount={peaks.length}
        onResetAllPeaks={() => onPeaksChange([])}
      />
    ),
    [
      handleResetNormalizationRegions,
      isPeakSetMode,
      isPlotNormalizationMode,
      normalizationSelectionTarget,
      onPeaksChange,
      peaks.length,
      plotModel?.points.length,
    ],
  );

  const plotContext = useMemo(() => {
    if (isPlotNormalizationMode) {
      return { kind: "normalize" as const, target: normalizationSelectionTarget };
    }
    if (isPeakSetMode) {
      return { kind: "peak-edit" as const };
    }
    return { kind: "explore" as const };
  }, [isPeakSetMode, isPlotNormalizationMode, normalizationSelectionTarget]);

  const showComputingOverlay =
    (isComputing ||
      (regions.length > 0 &&
        izero != null &&
        regionSpectra.length === 0 &&
        energyEv.length > 0)) &&
    !plotHasDisplayableData(result, regionSpectra);

  const awaitingRegionSpectra =
    regions.length > 0 &&
    izero != null &&
    regionSpectra.length === 0 &&
    energyEv.length > 0 &&
    !isComputing;

  const handleRegionDragStartWithTarget = useCallback(
    (_target: RegionDragTarget) => {
      onRegionDragStart();
    },
    [onRegionDragStart],
  );

  const plotBody = plotModel ? (
    <SpectrumPlot
      points={plotModel.points}
      height={height}
      graphStyle={graphStyle}
      yAxisQuantity={plotModel.yAxisQuantity}
      referenceCurves={plotModel.referenceCurves}
      companionSpectra={plotModel.companionSpectra}
      showNormalizationShading={plotModel.showNormalizationShading}
      normalizationRegions={plotModel.normalizationRegions}
      normalizationEdgeHandlesEnabled={
        isPlotNormalizationMode && plotModel.showNormalizationShading
      }
      onNormalizationEdgeEnergyChange={handleNormalizationEdgeEnergyChange}
      onNormalizationInteractionChange={onNormalizationInteractionChange}
      primaryTraceLabel={plotModel.primaryTraceLabel}
      primaryTraceColor={plotModel.primaryTraceColor}
      primaryTraceLegendId={plotModel.primaryTraceLegendId}
      primaryRegionSpotLabel={plotModel.primaryRegionSpotLabel}
      channelLegendGlyph={plotModel.channelLegendGlyph}
      hideGeometryLegend={plotModel.regionScopedTraces === true}
      headerRight={plotLeftRail}
      headerAnalysis={plotAnalysisRail}
      suppressAnalysisRailLeadingGrip
      cursorMode={cursorMode}
      onCursorModeChange={setCursorMode}
      plotContext={plotContext}
      peaks={peaks}
      selectedPeakId={selectedPeakId}
      onPeakSelect={setSelectedPeakId}
      onPeakUpdate={(peakId, energy) => {
        const roundedEnergy = Math.round(energy * 100) / 100;
        onPeaksChange(
          peaks.map((peak, index) => {
            const id = peak.id ?? `peak-${index}-${peak.energy}`;
            if (id !== peakId) {
              return peak;
            }
            return { ...peak, id, energy: roundedEnergy };
          }),
        );
      }}
      onPeakPatch={(peakId, patch) => {
        onPeaksChange(
          peaks.map((peak, index) => {
            const id = peak.id ?? `peak-${index}-${peak.energy}`;
            if (id !== peakId) {
              return peak;
            }
            const next = { ...peak, id };
            if (patch.energy !== undefined) {
              next.energy = Math.round(patch.energy * 100) / 100;
            }
            if (patch.peakKind !== undefined) {
              next.peakKind = patch.peakKind;
            }
            return next;
          }),
        );
      }}
      onPeakAdd={(energy) => {
        const roundedEnergy = Math.round(energy * 100) / 100;
        const id = `peak-${Date.now()}-${roundedEnergy}`;
        onPeaksChange([
          ...peaks,
          { id, energy: roundedEnergy, peakKind: "pi-star" },
        ]);
        setSelectedPeakId(id);
      }}
      onPeakDelete={(peakId) => {
        onPeaksChange(
          peaks.filter((peak, index) => {
            const id = peak.id ?? `peak-${index}-${peak.energy}`;
            return id !== peakId;
          }),
        );
        if (selectedPeakId === peakId) {
          setSelectedPeakId(null);
        }
      }}
      emptyStateMessage="Computing spectra for this channel."
    />
  ) : (
    <>
      {showComputingOverlay || awaitingRegionSpectra ? (
        <div
          className="border-border bg-default/20 flex flex-1 items-center justify-center rounded-md border"
          style={{ minHeight: height }}
        >
          <Spinner size="md" aria-label="Computing spectra" />
        </div>
      ) : (
        <StxmPlotChannelEmptyState
          title={plotEmptyState.title}
          detail={plotEmptyState.detail}
          actionLabel={plotEmptyState.actionLabel}
          height={height}
          emphasizeRequirement={
            plotEmptyState.title === "Molecule required" ||
            plotEmptyState.title === "Chemical formula required"
          }
        />
      )}
    </>
  );

  const graphContent = (
    <div className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-visible rounded-xl border border-[var(--border-default)] p-3">
      <div className="flex min-h-0 min-w-0 flex-1 items-stretch gap-2">
        {regionTrayOpen ? (
          <aside
            className="flex shrink-0 flex-col"
            style={{
              width: STXM_REGION_EDITOR_MAX_WIDTH_PX,
              height,
            }}
          >
            <StxmMultiRegionEditor
              image={imageMatrix}
              qaxisPoints={qaxisPoints}
              regions={regions}
              izero={izero}
              imageScaleMode={imageScaleMode}
              height={height}
              onRegionsChange={onRegionsChange}
              onRegionChange={onRegionChange}
              onIzeroChange={onIzeroChange}
              onDragStart={handleRegionDragStartWithTarget}
              onDragEnd={onRegionDragEnd}
              onAutoSuggest={onAutoSuggestRegions}
              regionTrayOpen={regionTrayOpen}
              onRegionTrayOpenChange={onRegionTrayOpenChange}
            />
          </aside>
        ) : (
          <div className="flex shrink-0 items-start pt-1">
            <StxmRegionTrayToggle
              regionTrayOpen={regionTrayOpen}
              onRegionTrayOpenChange={onRegionTrayOpenChange}
              hintPlacement="right"
            />
          </div>
        )}
        <div className="relative flex min-h-0 min-w-0 flex-1 flex-col">
          {plotBody}
          {showComputingOverlay && plotModel ? <PlotComputingOverlay /> : null}
        </div>
      </div>
    </div>
  );

  return (
    <div className="border-border bg-surface flex min-h-0 min-w-0 flex-1 flex-col gap-3 rounded-xl border p-3 shadow-sm">
      <DatasetVisualizationShell
        modes={STXM_VISUALIZATION_MODES}
        mode={visualizationMode}
        onModeChange={setVisualizationMode}
        graphStyle={graphStyle}
        onGraphStyleChange={setGraphStyle}
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
