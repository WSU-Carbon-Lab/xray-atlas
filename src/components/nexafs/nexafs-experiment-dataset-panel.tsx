"use client";

import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type Key as SelectionKey,
} from "react";
import { Copy, Download } from "lucide-react";
import { BareAtomStepEdgeIcon } from "~/components/icons";
import {
  Dropdown,
  Header,
  Separator,
  ToggleButton,
  ToggleButtonGroup,
  Toolbar,
} from "@heroui/react";
import { buttonVariants, cn } from "@heroui/styles";
import type {
  DifferenceSpectrum,
  ReferenceCurve,
  SpectrumPoint,
} from "~/components/plots/types";
import { SpectrumPlot } from "~/components/plots/spectrum-plot";
import {
  plotToolbarAttachedShellClass,
  plotToolbarBasisToggleClass,
  plotToolbarIconToolClass,
} from "~/components/plots/toolbars";
import type { CursorMode } from "~/components/plots/spectrum/ModeBar";
import {
  calculateBareAtomAbsorption,
  calculateDifferenceSpectra,
  computeBetaIndex,
  groupSpectrumByPolarizationThetaPhi,
  mapDbSpectrumRowsToAnnotated,
  mapDbSpectrumRowsToPoints,
  spectrumPointsToDetailedCsv,
  type SpectrumPolarizationNode,
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
import { LoadingSkeleton } from "~/components/feedback/loading-state";
import { NexafsBrowseGroupedSpectrumTable } from "~/components/nexafs/nexafs-browse-grouped-spectrum-table";

export interface NexafsExperimentDatasetPanelProps {
  experimentId: string;
  enabled: boolean;
}

function NexafsExperimentPlotSkeleton() {
  return (
    <div
      className="flex min-h-[420px] min-w-0 flex-1 flex-col rounded-xl border border-[var(--border-default)] p-4"
      aria-busy
      aria-label="Loading spectrum plot"
    >
      <div className="flex min-h-0 flex-1 gap-3">
        <div className="hidden w-9 shrink-0 flex-col justify-end pb-12 sm:flex">
          <LoadingSkeleton className="h-28 w-full rounded-md" />
        </div>
        <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-4">
          <LoadingSkeleton className="min-h-[280px] w-full flex-1 rounded-xl" />
          <div className="flex shrink-0 flex-wrap items-center justify-between gap-3">
            <LoadingSkeleton className="h-3 max-w-[min(24rem,55%)] flex-1 rounded" />
            <div className="flex items-center gap-2">
              <LoadingSkeleton className="h-9 w-9 shrink-0 rounded-full" />
              <LoadingSkeleton className="h-9 w-9 shrink-0 rounded-full" />
              <LoadingSkeleton className="h-9 w-9 shrink-0 rounded-full" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function spectrumPointsForPolarizationNode(
  node: SpectrumPolarizationNode,
): SpectrumPoint[] {
  const out: SpectrumPoint[] = [];
  for (const t of node.thetaNodes) {
    for (const leaf of t.phiLeaves) {
      out.push(...leaf.points);
    }
  }
  out.sort((a, b) => a.energy - b.energy);
  return out;
}

function filenameSuffixFromPolarizationKey(polKey: string): string {
  if (polKey === "__none__") return "unspecified-pol";
  return polKey.replace(/[^a-zA-Z0-9-]/g, "").slice(0, 12);
}

const ExperimentSpectrumRailCsvDropdown = memo(
  function ExperimentSpectrumRailCsvDropdown({
    kind,
    disabled,
    experimentId,
    sortedAllPoints,
    groupedTree,
  }: {
    kind: "download" | "copy";
    disabled: boolean;
    experimentId: string;
    sortedAllPoints: SpectrumPoint[];
    groupedTree: SpectrumPolarizationNode[];
  }) {
    const pointsByPolKey = useMemo(() => {
      const m = new Map<string, SpectrumPoint[]>();
      for (const node of groupedTree) {
        m.set(
          node.polarizationKey,
          spectrumPointsForPolarizationNode(node),
        );
      }
      return m;
    }, [groupedTree]);

    const downloadCsv = useCallback(
      (points: SpectrumPoint[], filenameBase: string) => {
        if (points.length === 0) return;
        const csv = spectrumPointsToDetailedCsv(points);
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${filenameBase}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        showToast("CSV download started", "success");
      },
      [],
    );

    const copyCsv = useCallback((points: SpectrumPoint[]) => {
      if (points.length === 0) return;
      const csv = spectrumPointsToDetailedCsv(points);
      void navigator.clipboard.writeText(csv).then(
        () => {
          showToast(`Copied ${points.length} rows as CSV`, "success");
        },
        () => {
          showToast("Could not copy to clipboard", "error");
        },
      );
    }, []);

    const onMenuAction = useCallback(
      (rawKey: SelectionKey) => {
        const key = String(rawKey);
        if (key === "png") return;
        if (disabled) return;
        const exp = `nexafs-experiment-${experimentId.slice(0, 8)}`;
        if (key === "csv-all") {
          if (kind === "download") {
            downloadCsv(sortedAllPoints, exp);
          } else {
            copyCsv(sortedAllPoints);
          }
          return;
        }
        const prefix = "csv-pol:";
        if (key.startsWith(prefix)) {
          const polKey = key.slice(prefix.length);
          const pts = pointsByPolKey.get(polKey) ?? [];
          const suffix = filenameSuffixFromPolarizationKey(polKey);
          if (kind === "download") {
            downloadCsv(pts, `${exp}-${suffix}`);
          } else {
            copyCsv(pts);
          }
        }
      },
      [
        copyCsv,
        disabled,
        downloadCsv,
        experimentId,
        kind,
        pointsByPolKey,
        sortedAllPoints,
      ],
    );

    const ariaLabel =
      kind === "download"
        ? "Download spectrum data"
        : "Copy spectrum data to clipboard";

    const triggerClass = cn(
      buttonVariants({ variant: "tertiary" }),
      plotToolbarIconToolClass,
      kind === "download"
        ? "!rounded-s-none !rounded-e-none"
        : "!rounded-s-none !rounded-e-3xl",
    );

    return (
      <Dropdown>
        <Dropdown.Trigger
          isDisabled={disabled}
          aria-label={ariaLabel}
          className={triggerClass}
        >
          <span
            className="inline-flex"
            title={kind === "download" ? "Download" : "Copy"}
          >
            {kind === "download" ? (
              <Download className="size-5 shrink-0" strokeWidth={1.5} aria-hidden />
            ) : (
              <Copy className="size-5 shrink-0" strokeWidth={1.5} aria-hidden />
            )}
          </span>
        </Dropdown.Trigger>
        <Dropdown.Popover className="border-border bg-surface min-w-[min(20rem,calc(100vw-2rem))] rounded-xl border p-1 shadow-lg">
            <Dropdown.Menu
              aria-label={
                kind === "download"
                  ? "Choose what to download"
                  : "Choose what to copy"
              }
              selectionMode="none"
              onAction={onMenuAction}
            >
              <Dropdown.Section>
                <Header className="px-2 py-1.5 text-xs font-semibold text-[var(--text-secondary)]">
                  Plot image (PNG)
                </Header>
                <Dropdown.Item
                  id="png"
                  isDisabled
                  textValue={
                    kind === "download"
                      ? "Download plot as PNG"
                      : "Copy plot as PNG"
                  }
                >
                  <div className="flex flex-col gap-0.5 py-0.5">
                    <span className="text-sm text-[var(--text-tertiary)]">
                      {kind === "download"
                        ? "Download plot as PNG"
                        : "Copy plot as PNG"}
                    </span>
                    <span className="text-xs text-[var(--text-tertiary)] opacity-80">
                      Coming soon
                    </span>
                  </div>
                </Dropdown.Item>
              </Dropdown.Section>
              <Separator
                orientation="horizontal"
                className="my-1 bg-[var(--border-default)]"
              />
              <Dropdown.Section>
                <Header className="px-2 py-1.5 text-xs font-semibold text-[var(--text-secondary)]">
                  Long table (CSV)
                </Header>
                <Dropdown.Item
                  id="csv-all"
                  isDisabled={disabled}
                  textValue={`All polarizations, ${sortedAllPoints.length} rows`}
                >
                  <span className="text-sm">
                    All polarizations
                    <span className="text-[var(--text-secondary)]">
                      {" "}
                      ({sortedAllPoints.length}{" "}
                      {sortedAllPoints.length === 1 ? "row" : "rows"})
                    </span>
                  </span>
                </Dropdown.Item>
              </Dropdown.Section>
              <Dropdown.Section>
                <Header className="px-2 py-1.5 text-xs font-semibold text-[var(--text-secondary)]">
                  One polarization (CSV)
                </Header>
                {groupedTree.map((node) => {
                  const n = pointsByPolKey.get(node.polarizationKey)?.length ?? 0;
                  return (
                    <Dropdown.Item
                      key={node.polarizationKey}
                      id={`csv-pol:${node.polarizationKey}`}
                      isDisabled={disabled}
                      textValue={`${node.label}, ${n} rows`}
                    >
                      <span className="text-sm">
                        {node.label}
                        <span className="text-[var(--text-secondary)]">
                          {" "}
                          ({n} {n === 1 ? "row" : "rows"})
                        </span>
                      </span>
                    </Dropdown.Item>
                  );
                })}
              </Dropdown.Section>
            </Dropdown.Menu>
          </Dropdown.Popover>
      </Dropdown>
    );
  },
);

function NexafsExperimentTableSkeleton() {
  return (
    <div
      className="flex min-h-[320px] flex-col gap-3 rounded-xl border border-[var(--border-default)] p-4"
      aria-busy
      aria-label="Loading spectrum table"
    >
      <div className="flex flex-wrap gap-2">
        <LoadingSkeleton className="h-9 w-40 rounded-lg" />
        <LoadingSkeleton className="h-9 w-32 rounded-lg" />
      </div>
      <LoadingSkeleton className="min-h-[220px] w-full flex-1 rounded-xl" />
    </div>
  );
}

/**
 * Fetches spectrum rows and peaks for one experiment and renders a read-only graph/table workspace with CSV copy/download on the plot top rail. Plot traces use stored column values (OD, mu, beta) from the database without recomputing normalization.
 *
 * @param experimentId Primary key for `spectrumpoints` / `peaksets` lookups.
 * @param enabled When false, skips network queries until the parent expands the panel.
 */
export function NexafsExperimentDatasetPanel({
  experimentId,
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
  const [showBareAtomOverlay, setShowBareAtomOverlay] = useState(false);
  const [bareAtomReference, setBareAtomReference] =
    useState<ReferenceCurve | null>(null);
  const showThetaPhiBeforeDiffRef = useRef<{
    showTheta: boolean;
    showPhi: boolean;
  } | null>(null);

  const pointsQuery = trpc.spectrumpoints.getByExperiment.useQuery(
    { experimentId, limit: 10000, offset: 0 },
    { enabled: enabled && Boolean(experimentId) },
  );

  const moleculeFormulaQuery =
    trpc.experiments.moleculeFormulaForExperiment.useQuery(
      { experimentId },
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
  });

  const chemicalFormula =
    moleculeFormulaQuery.data?.chemicalFormula ?? null;

  useEffect(() => {
    if (model.dataView === "od" && showBareAtomOverlay) {
      setShowBareAtomOverlay(false);
    }
  }, [model.dataView, showBareAtomOverlay]);

  useEffect(() => {
    if (
      !showBareAtomOverlay ||
      !chemicalFormula?.trim() ||
      model.dataView === "od"
    ) {
      setBareAtomReference(null);
      return;
    }

    const absorptionBasis = model.absorptionPlotPoints;
    if (absorptionBasis.length === 0) {
      setBareAtomReference(null);
      return;
    }

    let cancelled = false;

    void (async () => {
      try {
        const bareMu = await calculateBareAtomAbsorption(
          chemicalFormula,
          absorptionBasis,
        );
        if (cancelled) return;

        if (model.dataView === "beta") {
          const muLike: SpectrumPoint[] = bareMu.map((p) => ({
            energy: p.energy,
            absorption: p.absorption,
          }));
          const betaLike = computeBetaIndex(
            muLike,
            muLike.map((p) => p.energy),
            bareMu,
          );
          setBareAtomReference({
            label: "Bare atom beta",
            points: betaLike.map((p) => ({
              energy: p.energy,
              absorption: p.absorption,
            })),
            color: "#6b7280",
            showInLegend: false,
          });
        } else {
          setBareAtomReference({
            label: "Bare atom absorption",
            points: bareMu.map((p) => ({
              energy: p.energy,
              absorption: p.absorption,
            })),
            color: "#6b7280",
            showInLegend: false,
          });
        }
      } catch {
        if (!cancelled) {
          setBareAtomReference(null);
          showToast("Could not compute bare atom reference curve", "error");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    showBareAtomOverlay,
    chemicalFormula,
    model.dataView,
    model.absorptionPlotPoints,
  ]);

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

  const spectrumRailCsvMenusDisabled =
    pointsQuery.isLoading || sortedAllPoints.length === 0;

  const plotTopRailDataActions = useMemo(
    () => [
      <ExperimentSpectrumRailCsvDropdown
        key="spectrum-rail-download"
        kind="download"
        disabled={spectrumRailCsvMenusDisabled}
        experimentId={experimentId}
        sortedAllPoints={sortedAllPoints}
        groupedTree={groupedTree}
      />,
      <ExperimentSpectrumRailCsvDropdown
        key="spectrum-rail-copy"
        kind="copy"
        disabled={spectrumRailCsvMenusDisabled}
        experimentId={experimentId}
        sortedAllPoints={sortedAllPoints}
        groupedTree={groupedTree}
      />,
    ],
    [
      spectrumRailCsvMenusDisabled,
      experimentId,
      groupedTree,
      sortedAllPoints,
    ],
  );

  const referenceCurves = useMemo((): ReferenceCurve[] => {
    return bareAtomReference ? [bareAtomReference] : [];
  }, [bareAtomReference]);

  const overlaySelectedKey =
    model.dataView === "od"
      ? "od"
      : model.dataView === "beta"
        ? "beta"
        : "absorption";

  const diffBareSelectedKeys = useMemo(() => {
    const keys = new Set<string>();
    if (isDifferenceEnabled) keys.add("difference");
    if (showBareAtomOverlay) keys.add("bare-atom");
    return keys;
  }, [isDifferenceEnabled, showBareAtomOverlay]);

  const handleDiffBareSelectionChange = useCallback(
    (keys: Set<SelectionKey> | "all") => {
      const s =
        keys === "all"
          ? new Set<string>()
          : new Set([...keys].map((k) => String(k)));
      const nextDiff = s.has("difference");
      const nextBare = s.has("bare-atom");
      queueMicrotask(() => {
        if (nextDiff !== isDifferenceEnabled) {
          handleToggleDifferenceEnabled();
        }
        if (nextBare !== showBareAtomOverlay) {
          setShowBareAtomOverlay(nextBare);
        }
      });
    },
    [
      isDifferenceEnabled,
      showBareAtomOverlay,
      handleToggleDifferenceEnabled,
    ],
  );

  const plotLeftRail = (
    <div className="pointer-events-auto flex flex-col gap-2">
      <Toolbar
        isAttached
        orientation="vertical"
        aria-label="Spectrum display tools"
        className={`${plotToolbarAttachedShellClass} w-fit`}
      >
        <ToggleButtonGroup
          aria-label="Difference spectrum and bare atom reference"
          selectionMode="multiple"
          orientation="vertical"
          className="w-full overflow-hidden rounded-full"
          selectedKeys={diffBareSelectedKeys}
          onSelectionChange={handleDiffBareSelectionChange}
        >
          <ToggleButton
            isIconOnly
            aria-label="Difference spectrum between geometries"
            id="difference"
            className={plotToolbarBasisToggleClass}
          >
            <span className="text-xs font-semibold" aria-hidden>
              &#x0394;
            </span>
          </ToggleButton>
          <ToggleButton
            isIconOnly
            aria-label={
              model.dataView === "od"
                ? "Bare atom overlay (not available in OD view)"
                : chemicalFormula
                  ? "Bare atom reference curve on this energy grid"
                  : "Bare atom overlay (no chemical formula on linked molecule)"
            }
            id="bare-atom"
            isDisabled={
              !chemicalFormula ||
              model.dataView === "od" ||
              moleculeFormulaQuery.isLoading
            }
            className={plotToolbarBasisToggleClass}
          >
            <ToggleButtonGroup.Separator />
            <BareAtomStepEdgeIcon className="h-6 w-6" aria-hidden />
          </ToggleButton>
        </ToggleButtonGroup>

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
            isDisabled={!model.odAvailable}
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

  if (pointsQuery.isError) {
    return (
      <div className="text-danger rounded-xl border border-dashed border-red-500/40 p-4 text-sm">
        Could not load spectrum points for this experiment.
      </div>
    );
  }

  const isSpectrumLoading = pointsQuery.isLoading;

  if (!isSpectrumLoading && spectrumPoints.length === 0) {
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
      <VisualizationToggle
        mode={visualizationMode}
        graphStyle={graphStyle}
        onModeChange={setVisualizationMode}
        onGraphStyleChange={setGraphStyle}
        showEditButton={false}
      />

      {visualizationMode === "graph" ? (
        isSpectrumLoading ? (
          <NexafsExperimentPlotSkeleton />
        ) : (
          <div className="flex min-h-[420px] min-w-0 flex-1 flex-col rounded-xl border border-[var(--border-default)] p-4">
            <SpectrumPlot
              points={model.plotPoints}
              graphStyle={graphStyle}
              yAxisQuantity={model.spectrumYAxisQuantity}
              referenceCurves={referenceCurves}
              normalizationRegions={undefined}
              showNormalizationShading={false}
              plotContext={{ kind: "explore" }}
              peaks={plotPeaks}
              differenceSpectra={differenceSpectra}
              showThetaData={showThetaData}
              showPhiData={showPhiData}
              headerRight={plotLeftRail}
              plotTopRailDataActions={plotTopRailDataActions}
              cursorMode={cursorMode}
              onCursorModeChange={setCursorMode}
              emptyStateMessage="No points in this view."
            />
          </div>
        )
      ) : isSpectrumLoading ? (
        <NexafsExperimentTableSkeleton />
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
