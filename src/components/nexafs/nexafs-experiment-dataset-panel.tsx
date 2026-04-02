"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Download, Copy } from "lucide-react";
import {
  Button,
  Separator,
  ToggleButton,
  ToggleButtonGroup,
  Toolbar,
  Tooltip,
} from "@heroui/react";
import type {
  DifferenceSpectrum,
  SpectrumPoint,
} from "~/components/plots/types";
import { SpectrumPlot } from "~/components/plots/spectrum-plot";
import {
  plotToolbarAttachedShellClass,
  plotToolbarBasisToggleClass,
  plotToolbarDifferenceToggleClass,
  plotToolbarGlyphToggleStandaloneClass,
} from "~/components/plots/toolbars";
import type { CursorMode } from "~/components/plots/spectrum/ModeBar";
import {
  calculateDifferenceSpectra,
  groupSpectrumByPolarizationThetaPhi,
  mapDbSpectrumRowsToAnnotated,
  mapDbSpectrumRowsToPoints,
  spectrumPointsToDetailedCsv,
} from "~/features/process-nexafs/utils";
import {
  mapPeaksetsToPlotPeaks,
  useNexafsSpectrumBrowseModel,
} from "~/features/process-nexafs/hooks/useNexafsSpectrumBrowseModel";
import { VisualizationToggle } from "~/features/process-nexafs/ui/visualization-toggle";
import type {
  VisualizationMode,
  GraphStyle,
} from "~/features/process-nexafs/ui/visualization-toggle";
import { trpc } from "~/trpc/client";
import { showToast } from "~/components/ui/toast";
import { BareAtomStepEdgeIcon } from "~/components/icons/bare-atom-step-edge-icon";
import { NexafsBrowseGroupedSpectrumTable } from "~/components/nexafs/nexafs-browse-grouped-spectrum-table";

export interface NexafsExperimentDatasetPanelProps {
  experimentId: string;
  chemicalFormula: string;
  enabled: boolean;
}

/**
 * Fetches spectrum rows and peaks for one experiment and renders a read-only graph/table workspace with CSV export, matching contribute plot semantics without peak editing or normalization brushes.
 *
 * @param experimentId Primary key for `spectrumpoints` / `peaksets` lookups.
 * @param chemicalFormula Molecule formula used for optional bare-atom overlay and beta; may be empty when unknown.
 * @param enabled When false, skips network queries until the parent expands the panel.
 */
export function NexafsExperimentDatasetPanel({
  experimentId,
  chemicalFormula,
  enabled,
}: NexafsExperimentDatasetPanelProps) {
  const [visualizationMode, setVisualizationMode] =
    useState<VisualizationMode>("graph");
  const [graphStyle, setGraphStyle] = useState<GraphStyle>("line");
  const [cursorMode, setCursorMode] = useState<CursorMode>("inspect");
  const [differenceSpectra, setDifferenceSpectra] = useState<
    DifferenceSpectrum[]
  >([]);
  const [differenceAngleMode, setDifferenceAngleMode] = useState<
    "theta" | "phi"
  >("theta");
  const [showThetaData, setShowThetaData] = useState(false);
  const [showPhiData, setShowPhiData] = useState(false);
  const showThetaPhiBeforeDiffRef = useRef<{
    showTheta: boolean;
    showPhi: boolean;
  } | null>(null);

  const pointsQuery = trpc.spectrumpoints.getByExperiment.useQuery(
    { experimentId, limit: 10000, offset: 0 },
    { enabled: enabled && Boolean(experimentId) },
  );

  const peaksQuery = trpc.spectrumpoints.peaksForExperiment.useQuery(
    { experimentId },
    { enabled: enabled && Boolean(experimentId) },
  );

  const annotatedRows = useMemo(
    () =>
      pointsQuery.data?.length
        ? mapDbSpectrumRowsToAnnotated(pointsQuery.data)
        : [],
    [pointsQuery.data],
  );

  const spectrumPoints = useMemo(
    () => mapDbSpectrumRowsToPoints(pointsQuery.data ?? []),
    [pointsQuery.data],
  );

  const groupedTree = useMemo(
    () => groupSpectrumByPolarizationThetaPhi(annotatedRows),
    [annotatedRows],
  );

  const model = useNexafsSpectrumBrowseModel({
    spectrumPoints,
    chemicalFormula: chemicalFormula?.trim() ? chemicalFormula : null,
  });

  const plotPeaks = useMemo(
    () => mapPeaksetsToPlotPeaks(peaksQuery.data ?? []),
    [peaksQuery.data],
  );

  const differenceRootPoints = useMemo((): SpectrumPoint[] => {
    if (model.dataView === "od") return model.edgeZeroOnePoints;
    if (model.dataView === "beta") return model.betaPoints ?? [];
    return model.absorptionPlotPoints;
  }, [
    model.dataView,
    model.edgeZeroOnePoints,
    model.absorptionPlotPoints,
    model.betaPoints,
  ]);

  const firstDifferenceLabel = differenceSpectra[0]?.label ?? "";

  useEffect(() => {
    if (differenceSpectra.length === 0) return;
    if (firstDifferenceLabel.includes("Δφ")) {
      setDifferenceAngleMode("phi");
    } else if (firstDifferenceLabel.includes("Δθ")) {
      setDifferenceAngleMode("theta");
    }
  }, [differenceSpectra.length, firstDifferenceLabel]);

  const computeDifferenceSpectraFromRoot = useCallback(
    (angleMode: "theta" | "phi") => {
      if (differenceRootPoints.length === 0) {
        showToast("No points in this view for difference spectra", "info");
        return false;
      }
      const calculated = calculateDifferenceSpectra(
        differenceRootPoints,
        angleMode,
      );
      if (calculated.length === 0) {
        showToast(
          "Difference spectra need at least two distinct geometries",
          "info",
        );
        return false;
      }
      setDifferenceSpectra(calculated);
      return true;
    },
    [differenceRootPoints],
  );

  useEffect(() => {
    if (differenceSpectra.length === 0) return;
    void computeDifferenceSpectraFromRoot(differenceAngleMode);
  }, [
    model.dataView,
    differenceAngleMode,
    differenceRootPoints,
    differenceSpectra.length,
    computeDifferenceSpectraFromRoot,
  ]);

  const isDifferenceEnabled = differenceSpectra.length > 0;

  const handleToggleDifferenceEnabled = useCallback(() => {
    if (isDifferenceEnabled) {
      setDifferenceSpectra([]);
      const prev = showThetaPhiBeforeDiffRef.current;
      showThetaPhiBeforeDiffRef.current = null;
      if (prev) {
        setShowThetaData(prev.showTheta);
        setShowPhiData(prev.showPhi);
      }
      return;
    }

    showThetaPhiBeforeDiffRef.current = {
      showTheta: showThetaData,
      showPhi: showPhiData,
    };

    const inferredMode: "theta" | "phi" =
      showThetaData && !showPhiData
        ? "theta"
        : showPhiData && !showThetaData
          ? "phi"
          : differenceAngleMode;

    setDifferenceAngleMode(inferredMode);
    setShowThetaData(false);
    setShowPhiData(false);

    const ok = computeDifferenceSpectraFromRoot(inferredMode);
    if (!ok) {
      const prev = showThetaPhiBeforeDiffRef.current;
      showThetaPhiBeforeDiffRef.current = null;
      if (prev) {
        setShowThetaData(prev.showTheta);
        setShowPhiData(prev.showPhi);
      }
    }
  }, [
    isDifferenceEnabled,
    showThetaData,
    showPhiData,
    differenceAngleMode,
    computeDifferenceSpectraFromRoot,
  ]);

  const sortedAllPoints = useMemo(() => {
    const copy = [...spectrumPoints];
    copy.sort((a, b) => a.energy - b.energy);
    return copy;
  }, [spectrumPoints]);

  const showOdCol = sortedAllPoints.some((p) => typeof p.od === "number");
  const showMassCol = sortedAllPoints.some(
    (p) => typeof p.massabsorption === "number",
  );
  const showBetaCol = sortedAllPoints.some((p) => typeof p.beta === "number");
  const showI0Col = sortedAllPoints.some((p) => typeof p.i0 === "number");

  const handleDownloadCsv = useCallback(() => {
    if (sortedAllPoints.length === 0) return;
    const csv = spectrumPointsToDetailedCsv(sortedAllPoints);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `nexafs-experiment-${experimentId.slice(0, 8)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("CSV download started", "success");
  }, [experimentId, sortedAllPoints]);

  const handleCopyCsv = useCallback(() => {
    if (sortedAllPoints.length === 0) return;
    const csv = spectrumPointsToDetailedCsv(sortedAllPoints);
    void navigator.clipboard.writeText(csv).then(() => {
      showToast(`Copied ${sortedAllPoints.length} rows as CSV`, "success");
    });
  }, [sortedAllPoints]);

  const overlaySelectedKey =
    model.dataView === "od"
      ? "od"
      : model.dataView === "beta"
        ? "beta"
        : "absorption";

  const bareAtomRailDisabled =
    model.bareAtomLoading ||
    (model.dataView !== "absorption" && model.dataView !== "beta") ||
    (!model.showBareAtomOverlay &&
      (!model.bareAtomReady || Boolean(model.bareAtomError)));

  const plotLeftRail = (
    <div className="pointer-events-auto flex flex-col gap-2">
      <Toolbar
        isAttached
        orientation="vertical"
        aria-label="Spectrum display and overlays"
        className={`${plotToolbarAttachedShellClass} w-fit`}
      >
        <Tooltip delay={0}>
          <Tooltip.Trigger>
            <ToggleButton
              isIconOnly
              aria-label="Toggle bare-atom reference overlay"
              id="bare-atom-overlay"
              isSelected={model.showBareAtomOverlay}
              onChange={(next) => {
                if (next !== model.showBareAtomOverlay) {
                  queueMicrotask(() => {
                    model.setShowBareAtomOverlay(next);
                  });
                }
              }}
              isDisabled={bareAtomRailDisabled}
              className={plotToolbarGlyphToggleStandaloneClass}
            >
              <BareAtomStepEdgeIcon className="h-5 w-5" aria-hidden />
            </ToggleButton>
          </Tooltip.Trigger>
          <Tooltip.Content
            placement="right"
            className="bg-foreground text-background max-w-xs rounded-lg px-3 py-2 text-xs shadow-lg"
          >
            {model.dataView !== "absorption" && model.dataView !== "beta"
              ? "Switch to mu or beta to show bare-atom reference"
              : model.dataView === "beta"
                ? (model.bareAtomError ??
                  "Bare-atom beta from bare-atom mass absorption (mu)")
                : (model.bareAtomError ?? "Bare-atom mass absorption (mu)")}
          </Tooltip.Content>
        </Tooltip>

        <Separator orientation="horizontal" className="my-1 w-full shrink-0" />

        <Tooltip delay={0}>
          <Tooltip.Trigger>
            <ToggleButton
              isIconOnly
              aria-label="Difference spectrum toggle"
              id="difference"
              isSelected={isDifferenceEnabled}
              onChange={(next) => {
                if (next !== isDifferenceEnabled) {
                  queueMicrotask(() => {
                    handleToggleDifferenceEnabled();
                  });
                }
              }}
              className={plotToolbarDifferenceToggleClass}
            >
              <span className="text-xs font-semibold" aria-hidden>
                &#x0394;
              </span>
            </ToggleButton>
          </Tooltip.Trigger>
          <Tooltip.Content
            placement="right"
            className="bg-foreground text-background max-w-xs rounded-lg px-3 py-2 text-xs shadow-lg"
          >
            Show difference spectra between geometries
          </Tooltip.Content>
        </Tooltip>

        <Separator orientation="horizontal" className="my-1 w-full shrink-0" />

        <ToggleButtonGroup
          aria-label="Data view basis"
          selectionMode="single"
          orientation="vertical"
          className="w-full overflow-hidden rounded-full"
          selectedKeys={new Set([overlaySelectedKey])}
          onSelectionChange={(keys) => {
            const next = keys.values().next().value as string | undefined;
            if (next === "od") model.setDataView("od");
            else if (next === "absorption") model.setDataView("absorption");
            else if (next === "beta") model.setDataView("beta");
          }}
        >
          <ToggleButton
            isIconOnly
            aria-label="Optical density"
            id="od"
            className={plotToolbarBasisToggleClass}
          >
            <span className="text-xs font-semibold">OD</span>
          </ToggleButton>
          <ToggleButton
            isIconOnly
            aria-label="Mass absorption coefficient"
            id="absorption"
            isDisabled={!model.absorptionAvailable}
            className={plotToolbarBasisToggleClass}
          >
            <ToggleButtonGroup.Separator />
            <span className="text-sm font-semibold" aria-hidden>
              &#x00B5;
            </span>
          </ToggleButton>
          <ToggleButton
            isIconOnly
            aria-label="Beta index of refraction"
            id="beta"
            isDisabled={!model.betaAvailable}
            className={plotToolbarBasisToggleClass}
          >
            <ToggleButtonGroup.Separator />
            <span className="text-sm font-semibold" aria-hidden>
              &#x03B2;
            </span>
          </ToggleButton>
        </ToggleButtonGroup>
      </Toolbar>
    </div>
  );

  if (!enabled) return null;

  if (pointsQuery.isLoading) {
    return (
      <div className="text-text-secondary border-border rounded-xl border border-dashed p-4 text-sm">
        Loading spectrum data
      </div>
    );
  }

  if (pointsQuery.isError) {
    return (
      <div className="text-danger rounded-xl border border-dashed border-red-500/40 p-4 text-sm">
        Could not load spectrum points for this experiment.
      </div>
    );
  }

  if (spectrumPoints.length === 0) {
    return (
      <div className="text-text-secondary border-border rounded-xl border border-dashed p-4 text-sm">
        No spectrum rows are stored for this experiment yet.
      </div>
    );
  }

  return (
    <div
      className="border-border bg-surface mt-2 flex w-full flex-col gap-3 rounded-xl border p-4 shadow-sm"
      data-testid="nexafs-experiment-dataset-panel"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <VisualizationToggle
          mode={visualizationMode}
          graphStyle={graphStyle}
          onModeChange={setVisualizationMode}
          onGraphStyleChange={setGraphStyle}
          showEditButton={false}
        />
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="secondary"
            className="gap-1.5"
            onPress={handleDownloadCsv}
          >
            <Download className="size-4" aria-hidden />
            Download CSV
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="gap-1.5"
            onPress={handleCopyCsv}
          >
            <Copy className="size-4" aria-hidden />
            Copy CSV
          </Button>
        </div>
      </div>

      {model.bareAtomLoading ? (
        <p className="text-text-tertiary text-xs">Computing bare-atom curve</p>
      ) : null}

      {visualizationMode === "graph" ? (
        <div className="flex min-h-[420px] min-w-0 flex-1 flex-col rounded-xl border border-[var(--border-default)] p-4">
          <SpectrumPlot
            points={model.plotPoints}
            graphStyle={graphStyle}
            yAxisQuantity={model.spectrumYAxisQuantity}
            referenceCurves={model.referenceCurves}
            normalizationRegions={
              model.showNormalizationShading
                ? {
                    pre: model.normalizationRegions.pre,
                    post: model.normalizationRegions.post,
                  }
                : undefined
            }
            showNormalizationShading={model.showNormalizationShading}
            plotContext={{ kind: "explore" }}
            peaks={plotPeaks}
            differenceSpectra={differenceSpectra}
            showThetaData={showThetaData}
            showPhiData={showPhiData}
            headerRight={plotLeftRail}
            cursorMode={cursorMode}
            onCursorModeChange={setCursorMode}
            emptyStateMessage="No points in this view."
          />
        </div>
      ) : (
        <NexafsBrowseGroupedSpectrumTable
          idPrefix={experimentId}
          tree={groupedTree}
          showOdCol={showOdCol}
          showMassCol={showMassCol}
          showBetaCol={showBetaCol}
          showI0Col={showI0Col}
        />
      )}
    </div>
  );
}
