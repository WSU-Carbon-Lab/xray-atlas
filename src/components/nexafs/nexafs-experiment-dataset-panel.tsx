"use client";

import {
  memo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type Key as SelectionKey,
} from "react";
import { createPortal } from "react-dom";
import { Copy, Download } from "lucide-react";
import { BareAtomStepEdgeIcon } from "~/components/icons";
import {
  BUTTON_GROUP_CHILD,
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

function formatThetaPhiLabel(theta: number | null, phi: number | null): string {
  const t =
    theta != null && Number.isFinite(theta) ? `${theta.toFixed(1)}` : "—";
  const p = phi != null && Number.isFinite(phi) ? `${phi.toFixed(1)}` : "—";
  return `θ ${t}°, φ ${p}°`;
}

function fileSuffixForGeometryLeaf(
  polKey: string,
  thetaKey: string,
  phiKey: string,
): string {
  const pol =
    polKey === "__none__"
      ? "pol-none"
      : `pol-${polKey.replace(/[^a-zA-Z0-9]/g, "").slice(0, 8)}`;
  const t =
    thetaKey === "none" ? "th-x" : `th${thetaKey.replace(/[^0-9.-]/g, "x")}`;
  const p =
    phiKey === "none" ? "ph-x" : `ph${phiKey.replace(/[^0-9.-]/g, "x")}`;
  return `${pol}-${t}-${p}`;
}

interface SpectrumGeometryCsvRow {
  id: string;
  label: string;
  rowCount: number;
  points: SpectrumPoint[];
  fileSuffix: string;
}

function spectrumGeometryCsvRowsFromTree(
  tree: SpectrumPolarizationNode[],
): SpectrumGeometryCsvRow[] {
  const rows: SpectrumGeometryCsvRow[] = [];
  for (const node of tree) {
    for (const t of node.thetaNodes) {
      for (const leaf of t.phiLeaves) {
        rows.push({
          id: `${node.polarizationKey}|${t.thetaKey}|${leaf.phiKey}`,
          label: formatThetaPhiLabel(t.theta, leaf.phi),
          rowCount: leaf.points.length,
          points: leaf.points,
          fileSuffix: fileSuffixForGeometryLeaf(
            node.polarizationKey,
            t.thetaKey,
            leaf.phiKey,
          ),
        });
      }
    }
  }
  return rows;
}

const ExperimentSpectrumRailCsvDropdown = memo(
  function ExperimentSpectrumRailCsvDropdown({
    kind,
    disabled,
    experimentId,
    sortedAllPoints,
    groupedTree,
    [BUTTON_GROUP_CHILD]: _buttonGroupChild,
  }: {
    kind: "download" | "copy";
    disabled: boolean;
    experimentId: string;
    sortedAllPoints: SpectrumPoint[];
    groupedTree: SpectrumPolarizationNode[];
    [BUTTON_GROUP_CHILD]?: boolean;
  }) {
    const [open, setOpen] = useState(false);
    const triggerRef = useRef<HTMLButtonElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });

    const geometryCsvRows = useMemo(
      () => spectrumGeometryCsvRowsFromTree(groupedTree),
      [groupedTree],
    );

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

    const expBase = useMemo(
      () => `nexafs-experiment-${experimentId.slice(0, 8)}`,
      [experimentId],
    );

    const updateMenuPosition = useCallback(() => {
      const el = triggerRef.current;
      if (!el || typeof window === "undefined") return;
      const r = el.getBoundingClientRect();
      const margin = 8;
      const menuWidth = Math.min(352, window.innerWidth - margin * 2);
      let left = r.left;
      if (left + menuWidth > window.innerWidth - margin) {
        left = Math.max(margin, window.innerWidth - menuWidth - margin);
      }
      setMenuPos({ top: r.bottom + margin, left });
    }, []);

    useLayoutEffect(() => {
      if (!open) return;
      updateMenuPosition();
    }, [open, updateMenuPosition]);

    useEffect(() => {
      if (!open) return;
      const onResize = () => updateMenuPosition();
      window.addEventListener("resize", onResize);
      return () => window.removeEventListener("resize", onResize);
    }, [open, updateMenuPosition]);

    useEffect(() => {
      if (!open) return;
      const onKey = (e: KeyboardEvent) => {
        if (e.key === "Escape") setOpen(false);
      };
      window.addEventListener("keydown", onKey);
      return () => window.removeEventListener("keydown", onKey);
    }, [open]);

    useEffect(() => {
      if (!open) return;
      const onDoc = (e: MouseEvent) => {
        const t = e.target as Node;
        if (triggerRef.current?.contains(t) || menuRef.current?.contains(t)) {
          return;
        }
        setOpen(false);
      };
      document.addEventListener("mousedown", onDoc);
      return () => document.removeEventListener("mousedown", onDoc);
    }, [open]);

    const ariaLabel =
      kind === "download"
        ? "Download spectrum data"
        : "Copy spectrum data to clipboard";

    const menuAriaLabel =
      kind === "download"
        ? "Choose what to download"
        : "Choose what to copy";

    const triggerClass = cn(
      buttonVariants({ variant: "tertiary" }),
      plotToolbarIconToolClass,
      kind === "download"
        ? "!rounded-s-none !rounded-e-none"
        : "!rounded-s-none !rounded-e-3xl",
    );

    const runCsvAll = useCallback(() => {
      if (disabled) return;
      if (kind === "download") {
        downloadCsv(sortedAllPoints, expBase);
      } else {
        copyCsv(sortedAllPoints);
      }
      setOpen(false);
    }, [copyCsv, disabled, downloadCsv, expBase, kind, sortedAllPoints]);

    const runCsvGeometryLeaf = useCallback(
      (points: SpectrumPoint[], fileSuffix: string) => {
        if (disabled || points.length === 0) return;
        if (kind === "download") {
          downloadCsv(points, `${expBase}-${fileSuffix}`);
        } else {
          copyCsv(points);
        }
        setOpen(false);
      },
      [copyCsv, disabled, downloadCsv, expBase, kind],
    );

    const menuShellClass =
      "border-border bg-surface fixed z-50 max-h-[min(26rem,calc(100vh-2rem))] w-[min(22rem,calc(100vw-2rem))] overflow-y-auto rounded-2xl border p-2 shadow-2xl ring-1 ring-[color-mix(in_oklab,var(--foreground)_8%,transparent)] scrollbar-thin";

    const sectionLabelClass =
      "px-2.5 pb-1.5 pt-2 text-[0.6875rem] font-bold uppercase tracking-[0.06em] text-[var(--text-tertiary)] first:pt-0.5";

    const menuItemClass =
      "text-foreground hover:bg-default/90 focus-visible:ring-accent flex w-full flex-col items-start gap-0.5 rounded-xl px-3 py-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-45";

    const menuPortal =
      open &&
      typeof document !== "undefined" &&
      createPortal(
        <>
          <div
            className="fixed inset-0 z-40"
            aria-hidden
            onClick={() => setOpen(false)}
          />
          <div
            ref={menuRef}
            role="menu"
            aria-label={menuAriaLabel}
            className={menuShellClass}
            style={{ top: menuPos.top, left: menuPos.left }}
          >
            <div className={sectionLabelClass}>Plot image (PNG)</div>
            <button
              type="button"
              disabled
              role="menuitem"
              title="Coming soon"
              className="text-muted bg-[color-mix(in_oklab,var(--surface-2)_55%,transparent)] flex w-full cursor-not-allowed flex-col items-start gap-0.5 rounded-xl border border-[color-mix(in_oklab,var(--border-default)_70%,transparent)] px-3 py-2.5 text-left opacity-75"
            >
              <span className="text-sm font-medium">
                {kind === "download"
                  ? "Download plot as PNG"
                  : "Copy plot as PNG"}
              </span>
              <span className="text-xs text-[var(--text-tertiary)]">
                Coming soon
              </span>
            </button>
            <div
              className="my-2 h-px bg-[color-mix(in_oklab,var(--border-default)_85%,transparent)]"
              role="separator"
            />
            <div className={sectionLabelClass}>All</div>
            <button
              type="button"
              role="menuitem"
              disabled={disabled}
              onClick={runCsvAll}
              className={menuItemClass}
            >
              <span className="text-sm font-medium">All polarizations</span>
              <span className="text-xs tabular-nums text-[var(--text-secondary)]">
                {sortedAllPoints.length}{" "}
                {sortedAllPoints.length === 1 ? "row" : "rows"}
              </span>
            </button>
            <div
              className="my-2 h-px bg-[color-mix(in_oklab,var(--border-default)_85%,transparent)]"
              role="separator"
            />
            <div className={sectionLabelClass}>By geometry</div>
            <div className="flex flex-col gap-0.5">
              {geometryCsvRows.map((row) => (
                <button
                  key={row.id}
                  type="button"
                  role="menuitem"
                  disabled={disabled}
                  onClick={() =>
                    runCsvGeometryLeaf(row.points, row.fileSuffix)
                  }
                  className={menuItemClass}
                >
                  <span className="font-mono text-sm font-medium tracking-tight">
                    {row.label}
                  </span>
                  <span className="text-xs tabular-nums text-[var(--text-secondary)]">
                    {row.rowCount} {row.rowCount === 1 ? "row" : "rows"}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </>,
        document.body,
      );

    return (
      <div className="relative inline-flex">
        <button
          ref={triggerRef}
          type="button"
          disabled={disabled}
          aria-label={ariaLabel}
          aria-expanded={open}
          aria-haspopup="menu"
          title={kind === "download" ? "Download" : "Copy"}
          className={triggerClass}
          onClick={() => {
            if (disabled) return;
            setOpen((v) => !v);
          }}
        >
          {kind === "download" ? (
            <Download className="size-5 shrink-0" strokeWidth={1.5} aria-hidden />
          ) : (
            <Copy className="size-5 shrink-0" strokeWidth={1.5} aria-hidden />
          )}
        </button>
        {menuPortal}
      </div>
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
