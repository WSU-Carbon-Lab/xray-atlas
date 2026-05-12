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
import { useSession } from "next-auth/react";
import { createPortal } from "react-dom";
import { PencilIcon } from "@heroicons/react/24/outline";
import { Copy, Download, RotateCcw, Save } from "lucide-react";
import { BareAtomStepEdgeIcon } from "~/components/icons";
import {
  BUTTON_GROUP_CHILD,
  Button,
  Separator,
  ToggleButton,
  ToggleButtonGroup,
  Toolbar,
  Tooltip,
  type Key as HeroUiKey,
} from "@heroui/react";
import { buttonVariants, cn } from "@heroui/styles";
import type {
  DifferenceSpectrum,
  GeometryGroup,
  NormalizationRegionEdgeId,
  NormalizationRegions,
  ReferenceCurve,
  SpectrumPoint,
  SpectrumSelection,
} from "~/components/plots/types";
import { groupPointsByGeometry, sortedGeometryGroupEntries } from "~/components/plots/utils/trace-utils";
import { filterSpectrumPointsForGroupedPlot } from "~/components/plots/hooks/useSpectrumData";
import { SpectrumPlot } from "~/components/plots/spectrum-plot";
import {
  PlotSpectrumToolsToolbarSection,
  plotToolbarAttachedShellClass,
  plotToolbarBasisToggleClass,
  plotToolbarGlyphToggleGroupItemHorizontalClass,
  plotToolbarGlyphToggleStandaloneClass,
  plotToolbarIconToolClass,
} from "~/components/plots/toolbars";
import type { CursorMode } from "~/components/plots/spectrum/ModeBar";
import {
  calculateBareAtomAbsorption,
  calculateDifferenceSpectra,
  computeBetaIndex,
  computeNormalizationForExperiment,
  computeZeroOneNormalization,
  groupSpectrumByPolarizationThetaPhi,
  mapDbSpectrumRowsToAnnotated,
  mapDbSpectrumRowsToPoints,
  spectrumPointsToDetailedCsv,
  warmBareAtomCacheForFormula,
  type SpectrumPolarizationNode,
} from "~/features/process-nexafs/utils";
import { defaultNormalizationRangesFromSpectrum } from "~/features/process-nexafs/utils/normalizationDefaults";
import type {
  BareAtomPoint,
  NormalizationRanges as PersistedNormalizationRanges,
  NormalizationScope,
} from "~/features/process-nexafs/types";
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
import {
  buildSpectrumpointDeltaUpdatesFromRows,
  DEFAULT_KK_MASS_DENSITY_G_CM3,
  grantKkBrowserConsent,
  KkBrowserConsentDialog,
  readKkBrowserConsentGranted,
} from "~/features/kk-calc";
import { computeDeltaFromBetaKkcalcStyle } from "~/features/kk-calc/compute-delta-from-beta-kkcalc-style";
import { alignKkDeltaToSpectrumEnergyAxis } from "~/features/kk-calc/makima-interpolate";
import { parseChemicalFormula } from "~/features/kk-calc/kkcalc-stoichiometry";
import { resolveHenkeKkMergeDomainFromPrePostWindows } from "~/features/kk-calc/resolve-henke-kk-merge-domain";
import {
  parseStoredNormalizationRanges,
  unifiedNormalizationWindowsForBasis,
} from "~/lib/nexafs-normalization-ranges";
import { LoadingSkeleton } from "~/components/feedback/loading-state";
import { NexafsBrowseGroupedSpectrumTable } from "~/components/nexafs/nexafs-browse-grouped-spectrum-table";

interface ExperimentFormulaMeta {
  chemicalFormula?: string | null;
  normalizationScope?: string | null;
  normalizationRanges?: unknown;
  uploadedChannels?: unknown;
  canEditNormalizationMetadata?: boolean;
}

interface SpectrumRowForKk {
  id: string;
  polarizationid: string | null;
  energyev: number;
  beta: number | null;
}

type UploadChan = "rawabs" | "od" | "massabsorption" | "beta";

function uploadedChannelsForMutation(raw: unknown): UploadChan[] {
  if (!Array.isArray(raw)) {
    return ["rawabs"];
  }
  const out: UploadChan[] = [];
  for (const x of raw) {
    if (
      typeof x === "string" &&
      (x === "rawabs" ||
        x === "od" ||
        x === "massabsorption" ||
        x === "beta")
    ) {
      out.push(x);
    }
  }
  return out.length > 0 ? out : ["rawabs"];
}

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

function geometryGroupToSpectrumPoints(group: GeometryGroup): SpectrumPoint[] {
  return group.energies.map((energy, i) => ({
    energy,
    absorption: group.absorptions[i] ?? Number.NaN,
    theta: group.theta,
    phi: group.phi,
  }));
}

function toStrictAscendingEnergySpectrumPoints(
  points: SpectrumPoint[],
): SpectrumPoint[] {
  const sorted = [...points].sort((a, b) => a.energy - b.energy);
  const out: SpectrumPoint[] = [];
  for (const p of sorted) {
    if (!Number.isFinite(p.energy) || !Number.isFinite(p.absorption)) {
      continue;
    }
    if (out.length > 0 && !(p.energy > out[out.length - 1]!.energy)) {
      continue;
    }
    out.push(p);
  }
  return out;
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
  const [bareAtomReferences, setBareAtomReferences] = useState<
    ReferenceCurve[]
  >([]);
  const [bareAtomMuOverlayPoints, setBareAtomMuOverlayPoints] = useState<
    BareAtomPoint[] | null
  >(null);
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
  const moleculeMeta =
    moleculeFormulaQuery.data as ExperimentFormulaMeta | undefined;
  const chemicalFormula = moleculeMeta?.chemicalFormula ?? null;
  const normalizationScopeForKk = moleculeMeta?.normalizationScope ?? null;
  const normalizationRangesKeyForKk = JSON.stringify(
    moleculeMeta?.normalizationRanges ?? null,
  );

  const peaksQuery = trpc.spectrumpoints.peaksForExperiment.useQuery(
    { experimentId },
    { enabled: enabled && Boolean(experimentId) },
  );

  const { data: session } = useSession();
  const utils = trpc.useUtils();
  const canRecalculateKk = trpc.spectrumpoints.canRecalculateKkDelta.useQuery(
    { experimentId },
    { enabled: enabled && Boolean(experimentId) && Boolean(session?.user) },
  );
  const kkRecalcAllowed = Boolean(canRecalculateKk.data?.allowed);
  const updateKkDeltaBatch = trpc.spectrumpoints.updateKkDeltaBatch.useMutation({
    onSuccess: () => {
      void utils.spectrumpoints.getByExperiment.invalidate({ experimentId });
    },
  });
  const updateNormalizationMetadata =
    trpc.experiments.updateNormalizationMetadata.useMutation({
      onSuccess: () => {
        void utils.experiments.moleculeFormulaForExperiment.invalidate({
          experimentId,
        });
      },
    });

  const [kkPanelConsentOpen, setKkPanelConsentOpen] = useState(false);
  const [kkRecalcBusy, setKkRecalcBusy] = useState(false);
  const [datasetPlotEditorActive, setDatasetPlotEditorActive] = useState(false);
  const [isPlotNormalizationMode, setIsPlotNormalizationMode] = useState(false);
  const [normalizationSelectionTarget, setNormalizationSelectionTarget] =
    useState<"pre" | "post" | null>(null);
  const [draftNormRegions, setDraftNormRegions] = useState<NormalizationRegions>(
    { pre: null, post: null },
  );
  const initialNormDraftRef = useRef<NormalizationRegions | null>(null);
  const [editorNormBaselineRaw, setEditorNormBaselineRaw] =
    useState<unknown>(null);
  const [editorNormBareMuPoints, setEditorNormBareMuPoints] = useState<
    BareAtomPoint[] | null
  >(null);

  const henkeMergeDomainForKkBeta = useMemo((): readonly [
    number,
    number,
  ] | undefined => {
    const formula = chemicalFormula?.trim();
    if (!formula) {
      return undefined;
    }
    let composition;
    try {
      composition = parseChemicalFormula(formula);
    } catch {
      return undefined;
    }
    let rangesRaw: unknown = null;
    try {
      rangesRaw =
        normalizationRangesKeyForKk === "null"
          ? null
          : (JSON.parse(normalizationRangesKeyForKk) as unknown);
    } catch {
      return undefined;
    }
    const ranges = parseStoredNormalizationRanges(rangesRaw);
    const win = unifiedNormalizationWindowsForBasis(
      normalizationScopeForKk,
      ranges,
      "beta",
    );
    if (!win?.pre || !win.post) {
      return undefined;
    }
    return resolveHenkeKkMergeDomainFromPrePostWindows({
      pre: win.pre,
      post: win.post,
      composition,
    });
  }, [chemicalFormula, normalizationScopeForKk, normalizationRangesKeyForKk]);

  const runKkRecalc = useCallback(async () => {
    const raw = pointsQuery.data as SpectrumRowForKk[] | undefined;
    if (!raw?.length || !session?.user) {
      return;
    }
    setKkRecalcBusy(true);
    try {
      const rows = raw.map((r) => ({
        id: r.id,
        polarizationid: r.polarizationid,
        energyev: r.energyev,
        beta: r.beta,
      }));
      const formula = chemicalFormula?.trim();
      if (!formula) {
        showToast(
          "Kramers–Kronig needs a chemical formula on the experiment molecule.",
          "info",
        );
        return;
      }
      const updates = buildSpectrumpointDeltaUpdatesFromRows(rows, {
        stoichiometryFormula: formula,
        massDensityGPerCm3: DEFAULT_KK_MASS_DENSITY_G_CM3,
        henkeMergeDomain: henkeMergeDomainForKkBeta,
      });
      if (updates.length === 0) {
        showToast(
          "Need at least four finite beta samples per polarization trace",
          "info",
        );
        return;
      }
      await updateKkDeltaBatch.mutateAsync({ experimentId, updates });
      showToast("Updated delta from beta (KK)", "success");
    } catch (e) {
      showToast(
        e instanceof Error ? e.message : "Could not update KK delta",
        "error",
      );
    } finally {
      setKkRecalcBusy(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Omit `pointsQuery.data` (TS2589 on router output); `dataUpdatedAt` tracks spectrumpoints cache updates.
  }, [
    pointsQuery.dataUpdatedAt,
    experimentId,
    session?.user,
    updateKkDeltaBatch,
    chemicalFormula,
    henkeMergeDomainForKkBeta,
  ]);

  const onPressRecalculateKk = useCallback(() => {
    if (!readKkBrowserConsentGranted()) {
      setKkPanelConsentOpen(true);
      return;
    }
    void runKkRecalc();
  }, [runKkRecalc]);

  /**
   * Reruns the Kramers Kronig delta pipeline from stored beta after discarding any
   * transient panel state for the current session. The persisted spectrum row beta
   * is always the input; this experiment does not maintain editable KK state, so
   * "reset" reduces to invoking the same recalculate path as {@link onPressRecalculateKk},
   * honoring the browser consent prompt when it has not yet been granted in this
   * session.
   */
  const onPressResetKk = useCallback(() => {
    if (!readKkBrowserConsentGranted()) {
      setKkPanelConsentOpen(true);
      return;
    }
    void runKkRecalc();
  }, [runKkRecalc]);

  const onPanelKkConsentAccept = useCallback(() => {
    grantKkBrowserConsent();
    setKkPanelConsentOpen(false);
    void runKkRecalc();
  }, [runKkRecalc]);

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

  const bareAtomOverlaySourcePoints = useMemo(
    () =>
      differenceSpectra.length > 0
        ? []
        : filterSpectrumPointsForGroupedPlot(
            model.plotPoints,
            showThetaData,
            showPhiData,
          ),
    [
      model.plotPoints,
      showThetaData,
      showPhiData,
      differenceSpectra.length,
    ],
  );

  useEffect(() => {
    if (!enabled || !chemicalFormula?.trim()) {
      return;
    }
    void warmBareAtomCacheForFormula(chemicalFormula).catch(() => undefined);
  }, [enabled, chemicalFormula]);

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
      setBareAtomReferences([]);
      setBareAtomMuOverlayPoints(null);
      return;
    }

    if (model.dataView === "delta" && !(model.deltaPoints?.length ?? 0)) {
      setBareAtomReferences([]);
      setBareAtomMuOverlayPoints(null);
      return;
    }

    const dataView = model.dataView;

    let cancelled = false;

    void (async () => {
      try {
        if (bareAtomOverlaySourcePoints.length === 0) {
          if (!cancelled) {
            setBareAtomReferences([]);
            setBareAtomMuOverlayPoints(null);
          }
          return;
        }

        const entries = sortedGeometryGroupEntries(
          groupPointsByGeometry(bareAtomOverlaySourcePoints),
        );

        type BareOverlayBuild = {
          curve: ReferenceCurve | null;
          bareMuForBetaPreview: BareAtomPoint[] | null;
        };

        const builds = await Promise.all(
          entries.map(async ([, group]): Promise<BareOverlayBuild> => {
            const strictPts = toStrictAscendingEnergySpectrumPoints(
              geometryGroupToSpectrumPoints(group),
            );
            if (strictPts.length === 0) {
              return { curve: null, bareMuForBetaPreview: null };
            }
            try {
              const bareMu = await calculateBareAtomAbsorption(
                chemicalFormula,
                strictPts,
              );
              if (bareMu.length === 0) {
                return { curve: null, bareMuForBetaPreview: null };
              }
              const geometryTag = group.label || "geometry";
              if (dataView === "beta") {
                const muLike: SpectrumPoint[] = bareMu.map((p) => ({
                  energy: p.energy,
                  absorption: p.absorption,
                }));
                const betaLike = computeBetaIndex(
                  muLike,
                  muLike.map((p) => p.energy),
                  bareMu,
                );
                const curve: ReferenceCurve = {
                  label: `Bare atom beta (${geometryTag})`,
                  points: betaLike.map((p) => ({
                    energy: p.energy,
                    absorption: p.absorption,
                  })),
                  color: "#6b7280",
                  showInLegend: false,
                };
                return {
                  curve,
                  bareMuForBetaPreview: bareMu,
                };
              }
              if (dataView === "delta") {
                if (strictPts.length < 4) {
                  return { curve: null, bareMuForBetaPreview: null };
                }
                const muLike: SpectrumPoint[] = bareMu.map((p) => ({
                  energy: p.energy,
                  absorption: p.absorption,
                }));
                const betaLike = computeBetaIndex(
                  muLike,
                  muLike.map((p) => p.energy),
                  bareMu,
                );
                const energyEv = betaLike.map((p) => p.energy);
                const betaArr = betaLike.map((p) => p.absorption);
                const rawDelta = computeDeltaFromBetaKkcalcStyle({
                  energyEv,
                  beta: betaArr,
                  stoichiometryFormula: chemicalFormula.trim(),
                  densityGPerCm3: DEFAULT_KK_MASS_DENSITY_G_CM3,
                  henkeMergeDomain: henkeMergeDomainForKkBeta,
                });
                const aligned = alignKkDeltaToSpectrumEnergyAxis(
                  energyEv,
                  energyEv,
                  rawDelta,
                );
                const curve: ReferenceCurve = {
                  label: `Bare atom delta (${geometryTag})`,
                  points: energyEv.map((energy, i) => ({
                    energy,
                    absorption: aligned[i]!,
                  })),
                  color: "#6b7280",
                  showInLegend: false,
                };
                return {
                  curve,
                  bareMuForBetaPreview: bareMu,
                };
              }
              const curve: ReferenceCurve = {
                label: `Bare atom absorption (${geometryTag})`,
                points: bareMu.map((p) => ({
                  energy: p.energy,
                  absorption: p.absorption,
                })),
                color: "#6b7280",
                showInLegend: false,
              };
              return { curve, bareMuForBetaPreview: bareMu };
            } catch {
              return { curve: null, bareMuForBetaPreview: null };
            }
          }),
        );

        if (cancelled) {
          return;
        }

        const next: ReferenceCurve[] = [];
        let firstCurveBareMu: BareAtomPoint[] | null = null;
        for (const b of builds) {
          if (!b.curve) {
            continue;
          }
          if (next.length === 0 && b.bareMuForBetaPreview?.length) {
            firstCurveBareMu = b.bareMuForBetaPreview;
          }
          next.push(b.curve);
        }
        setBareAtomReferences(next);
        setBareAtomMuOverlayPoints(firstCurveBareMu);
        if (next.length === 0 && entries.length > 0) {
          showToast("Could not compute bare atom reference curve", "error");
        }
      } catch {
        if (!cancelled) {
          setBareAtomReferences([]);
          setBareAtomMuOverlayPoints(null);
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
    model.deltaPoints,
    bareAtomOverlaySourcePoints,
    henkeMergeDomainForKkBeta,
  ]);

  const plotPeaks = useMemo(
    () => mapPeaksetsToPlotPeaks(peaksQuery.data ?? []),
    [peaksQuery.data],
  );

  const differenceRootPoints = useMemo((): SpectrumPoint[] => {
    if (model.dataView === "od") return model.edgeZeroOnePoints;
    if (model.dataView === "beta") return model.betaPoints ?? [];
    if (model.dataView === "delta") return model.deltaPoints ?? [];
    return model.absorptionPlotPoints;
  }, [
    model.dataView,
    model.edgeZeroOnePoints,
    model.absorptionPlotPoints,
    model.betaPoints,
    model.deltaPoints,
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
  const sortedSpectrumFirstEnergy = sortedAllPoints[0]?.energy;
  const sortedSpectrumLastEnergy =
    sortedAllPoints[sortedAllPoints.length - 1]?.energy;

  const showOdCol = sortedAllPoints.some((p) => typeof p.od === "number");
  const showMassCol = sortedAllPoints.some(
    (p) => typeof p.massabsorption === "number",
  );
  const showBetaCol = sortedAllPoints.some((p) => typeof p.beta === "number");
  const showDeltaCol = sortedAllPoints.some(
    (p) => typeof p.delta === "number" && Number.isFinite(p.delta),
  );
  const showI0Col = sortedAllPoints.some((p) => typeof p.i0 === "number");

  useEffect(() => {
    if (
      !datasetPlotEditorActive ||
      !showMassCol ||
      !chemicalFormula?.trim() ||
      !draftNormRegions.pre ||
      !draftNormRegions.post
    ) {
      setEditorNormBareMuPoints(null);
      return;
    }
    if (bareAtomOverlaySourcePoints.length === 0) {
      setEditorNormBareMuPoints(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      const entries = sortedGeometryGroupEntries(
        groupPointsByGeometry(bareAtomOverlaySourcePoints),
      );
      const firstGroup = entries[0]?.[1];
      if (!firstGroup) {
        if (!cancelled) {
          setEditorNormBareMuPoints(null);
        }
        return;
      }
      const strictPts = toStrictAscendingEnergySpectrumPoints(
        geometryGroupToSpectrumPoints(firstGroup),
      );
      if (strictPts.length === 0) {
        if (!cancelled) {
          setEditorNormBareMuPoints(null);
        }
        return;
      }
      try {
        const bareMu = await calculateBareAtomAbsorption(
          chemicalFormula,
          strictPts,
        );
        if (!cancelled) {
          setEditorNormBareMuPoints(bareMu.length > 0 ? bareMu : null);
        }
      } catch {
        if (!cancelled) {
          setEditorNormBareMuPoints(null);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    datasetPlotEditorActive,
    showMassCol,
    chemicalFormula,
    draftNormRegions.pre,
    draftNormRegions.post,
    bareAtomOverlaySourcePoints,
  ]);

  const spectrumRailCsvMenusDisabled =
    pointsQuery.isLoading || sortedAllPoints.length === 0;

  const referenceCurves = useMemo((): ReferenceCurve[] => {
    return bareAtomReferences;
  }, [bareAtomReferences]);

  const clientPreviewMuPoints = useMemo(() => {
    if (
      !datasetPlotEditorActive ||
      !draftNormRegions.pre ||
      !draftNormRegions.post
    ) {
      return null;
    }
    const pre = draftNormRegions.pre;
    const post = draftNormRegions.post;
    if (showMassCol) {
      if (!editorNormBareMuPoints?.length) {
        return null;
      }
      const preCount = sortedAllPoints.filter(
        (p) => p.energy >= pre[0] && p.energy <= pre[1],
      ).length;
      const postCount = sortedAllPoints.filter(
        (p) => p.energy >= post[0] && p.energy <= post[1],
      ).length;
      if (preCount === 0 || postCount === 0) {
        return null;
      }
      const massComp = computeNormalizationForExperiment(
        sortedAllPoints,
        editorNormBareMuPoints,
        preCount,
        postCount,
      );
      if (!massComp?.normalizedPoints.length) {
        return null;
      }
      return massComp.normalizedPoints;
    }
    const comp = computeZeroOneNormalization(sortedAllPoints, pre, post);
    if (!comp?.normalizedPoints.length) {
      return null;
    }
    return comp.normalizedPoints;
  }, [
    datasetPlotEditorActive,
    draftNormRegions.pre,
    draftNormRegions.post,
    editorNormBareMuPoints,
    showMassCol,
    sortedAllPoints,
  ]);

  const spectrumPlotPoints = useMemo(() => {
    if (!clientPreviewMuPoints) {
      return model.plotPoints;
    }
    if (model.dataView === "od") {
      return model.plotPoints;
    }
    if (model.dataView === "absorption") {
      return clientPreviewMuPoints;
    }
    if (model.dataView === "beta" && bareAtomMuOverlayPoints?.length) {
      return computeBetaIndex(
        clientPreviewMuPoints,
        clientPreviewMuPoints.map((p) => p.energy),
        bareAtomMuOverlayPoints,
      );
    }
    return model.plotPoints;
  }, [
    bareAtomMuOverlayPoints,
    clientPreviewMuPoints,
    model.dataView,
    model.plotPoints,
  ]);

  const overlaySelectedKey =
    model.dataView === "od"
      ? "od"
      : model.dataView === "beta"
        ? "beta"
        : model.dataView === "delta"
          ? "delta"
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

  const beginDatasetPlotEditor = useCallback(() => {
    const meta =
      moleculeFormulaQuery.data as ExperimentFormulaMeta | undefined;
    setEditorNormBaselineRaw(meta?.normalizationRanges ?? null);
    const parsed = parseStoredNormalizationRanges(meta?.normalizationRanges);
    const scope = (meta?.normalizationScope ?? "none") as NormalizationScope;
    const win = unifiedNormalizationWindowsForBasis(scope, parsed, "beta");
    const def = defaultNormalizationRangesFromSpectrum(sortedAllPoints);
    const pre = win?.pre
      ? ([
          Math.min(win.pre[0], win.pre[1]),
          Math.max(win.pre[0], win.pre[1]),
        ] as [number, number])
      : (def?.pre ?? null);
    const post = win?.post
      ? ([
          Math.min(win.post[0], win.post[1]),
          Math.max(win.post[0], win.post[1]),
        ] as [number, number])
      : (def?.post ?? null);
    const nextDraft: NormalizationRegions = { pre, post };
    setDraftNormRegions(nextDraft);
    initialNormDraftRef.current = {
      pre: nextDraft.pre,
      post: nextDraft.post,
    };
    setDatasetPlotEditorActive(true);
    setIsPlotNormalizationMode(false);
    setNormalizationSelectionTarget(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- Avoid `moleculeFormulaQuery.data` / full `sortedAllPoints` in deps (TS2589); keys, span, and `dataUpdatedAt` track payload changes.
  }, [
    normalizationRangesKeyForKk,
    normalizationScopeForKk,
    chemicalFormula,
    sortedAllPoints.length,
    sortedSpectrumFirstEnergy,
    sortedSpectrumLastEnergy,
    moleculeFormulaQuery.dataUpdatedAt,
  ]);

  const endDatasetPlotEditor = useCallback(() => {
    setDatasetPlotEditorActive(false);
    setIsPlotNormalizationMode(false);
    setNormalizationSelectionTarget(null);
    setEditorNormBaselineRaw(null);
    setEditorNormBareMuPoints(null);
    initialNormDraftRef.current = null;
  }, []);

  const handlePlotNormalizationMode = useCallback((enabled: boolean) => {
    setIsPlotNormalizationMode(enabled);
    if (!enabled) {
      setNormalizationSelectionTarget(null);
      setCursorMode("inspect");
    } else {
      setNormalizationSelectionTarget("pre");
    }
  }, []);

  const handleNormalizationDraftSelection = useCallback(
    (selection: SpectrumSelection | null) => {
      if (!selection || !normalizationSelectionTarget) {
        return;
      }
      const range: [number, number] = [
        Math.min(selection.energyMin, selection.energyMax),
        Math.max(selection.energyMin, selection.energyMax),
      ];
      if (normalizationSelectionTarget === "pre") {
        setDraftNormRegions((prev) => ({ ...prev, pre: range }));
      } else {
        setDraftNormRegions((prev) => ({ ...prev, post: range }));
      }
    },
    [normalizationSelectionTarget],
  );

  const handleResetDraftNormRegions = useCallback(() => {
    const def = defaultNormalizationRangesFromSpectrum(sortedAllPoints);
    if (!def) {
      return;
    }
    setDraftNormRegions({ pre: def.pre, post: def.post });
  }, [sortedAllPoints]);

  const handleBrowseNormalizationEdgeDrag = useCallback(
    (edge: NormalizationRegionEdgeId, energy: number) => {
      const sortPair = (a: number, b: number): [number, number] =>
        a <= b ? [a, b] : [b, a];
      setDraftNormRegions((regions) => {
        if (edge === "preMin" || edge === "preMax") {
          const cur = regions.pre;
          if (!cur) {
            return { ...regions, pre: sortPair(energy, energy) };
          }
          const lo = Math.min(cur[0], cur[1]);
          const hi = Math.max(cur[0], cur[1]);
          const next =
            edge === "preMin" ? sortPair(energy, hi) : sortPair(lo, energy);
          return { ...regions, pre: next };
        }
        const cur = regions.post;
        if (!cur) {
          return { ...regions, post: sortPair(energy, energy) };
        }
        const lo = Math.min(cur[0], cur[1]);
        const hi = Math.max(cur[0], cur[1]);
        const next =
          edge === "postMin" ? sortPair(energy, hi) : sortPair(lo, energy);
        return { ...regions, post: next };
      });
    },
    [],
  );

  const persistDraftNormalization = useCallback(async (): Promise<boolean> => {
    const meta = moleculeFormulaQuery.data as ExperimentFormulaMeta | undefined;
    if (!meta?.canEditNormalizationMetadata) {
      return false;
    }
    let scopeOut = (meta.normalizationScope ?? "none") as NormalizationScope;
    if (
      scopeOut === "none" &&
      (draftNormRegions.pre != null || draftNormRegions.post != null)
    ) {
      scopeOut = "unified";
    }
    const baselineParsed = parseStoredNormalizationRanges(editorNormBaselineRaw);
    let rangesOut: PersistedNormalizationRanges | null;
    if (
      scopeOut === "per_channel" &&
      baselineParsed != null &&
      typeof baselineParsed === "object" &&
      "od" in baselineParsed
    ) {
      rangesOut = {
        ...baselineParsed,
        beta: {
          pre: draftNormRegions.pre,
          post: draftNormRegions.post,
        },
      };
    } else {
      rangesOut = {
        pre: draftNormRegions.pre,
        post: draftNormRegions.post,
      };
    }
    try {
      await updateNormalizationMetadata.mutateAsync({
        experimentId,
        normalization: { scope: scopeOut, ranges: rangesOut },
        uploadedChannels: uploadedChannelsForMutation(meta.uploadedChannels),
      });
      initialNormDraftRef.current = {
        pre: draftNormRegions.pre,
        post: draftNormRegions.post,
      };
      return true;
    } catch (e) {
      showToast(
        e instanceof Error ? e.message : "Could not save normalization",
        "error",
      );
      return false;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- Avoid `moleculeFormulaQuery.data` in deps (TS2589); `dataUpdatedAt` tracks refetches.
  }, [
    chemicalFormula,
    normalizationScopeForKk,
    normalizationRangesKeyForKk,
    draftNormRegions,
    editorNormBaselineRaw,
    experimentId,
    updateNormalizationMetadata,
    moleculeFormulaQuery.dataUpdatedAt,
  ]);

  const handleSaveNormalizationRanges = useCallback(async () => {
    const ok = await persistDraftNormalization();
    if (!ok) return;
    showToast("Saved normalization regions", "success");
    endDatasetPlotEditor();
  }, [endDatasetPlotEditor, persistDraftNormalization]);

  const normDraftDirty = useMemo(() => {
    if (!datasetPlotEditorActive) {
      return false;
    }
    const init = initialNormDraftRef.current;
    if (!init) {
      return false;
    }
    return (
      JSON.stringify(draftNormRegions.pre) !== JSON.stringify(init.pre) ||
      JSON.stringify(draftNormRegions.post) !== JSON.stringify(init.post)
    );
  }, [datasetPlotEditorActive, draftNormRegions]);

  const datasetPlotEditorAvailable =
    Boolean(moleculeMeta?.canEditNormalizationMetadata) &&
    visualizationMode === "graph" &&
    !pointsQuery.isLoading;

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

  const handleToggleDatasetPlotEditor = useCallback(
    (next: boolean) => {
      if (next === datasetPlotEditorActive) {
        return;
      }
      if (next) {
        beginDatasetPlotEditor();
      } else {
        endDatasetPlotEditor();
      }
    },
    [beginDatasetPlotEditor, endDatasetPlotEditor, datasetPlotEditorActive],
  );

  const editSaveToolbarSelectedKeys = useMemo(
    () =>
      new Set<HeroUiKey>(datasetPlotEditorActive ? ["edit"] : []),
    [datasetPlotEditorActive],
  );

  const normResetDisabled =
    sortedAllPoints.length === 0 || updateNormalizationMetadata.isPending;

  const handleEditSaveToolbarSelectionChange = useCallback(
    (keys: Set<HeroUiKey>) => {
      const str = new Set(Array.from(keys, String));
      if (str.has("reset")) {
        if (!normResetDisabled) {
          handleResetDraftNormRegions();
        }
        return;
      }
      if (str.has("save")) {
        if (
          normDraftDirty &&
          !updateNormalizationMetadata.isPending &&
          datasetPlotEditorActive
        ) {
          void handleSaveNormalizationRanges();
        }
        return;
      }
      handleToggleDatasetPlotEditor(str.has("edit"));
    },
    [
      datasetPlotEditorActive,
      handleResetDraftNormRegions,
      handleSaveNormalizationRanges,
      handleToggleDatasetPlotEditor,
      normDraftDirty,
      normResetDisabled,
      updateNormalizationMetadata.isPending,
    ],
  );

  const plotTopRailTrailingActions = useMemo(
    () =>
      datasetPlotEditorAvailable ? (
        <>
          <ToggleButtonGroup
            aria-label="Edit, save, or reset normalization regions"
            selectionMode="multiple"
            orientation="horizontal"
            className="overflow-hidden rounded-full"
            selectedKeys={editSaveToolbarSelectedKeys}
            onSelectionChange={handleEditSaveToolbarSelectionChange}
          >
            <ToggleButton
              id="edit"
              isIconOnly
              aria-label={
                datasetPlotEditorActive
                  ? "Close dataset editor"
                  : "Edit normalization and Kramers Kronig delta"
              }
              className={plotToolbarGlyphToggleGroupItemHorizontalClass}
            >
              <PencilIcon className="h-5 w-5" aria-hidden />
            </ToggleButton>
            {datasetPlotEditorActive ? (
              <>
                <ToggleButton
                  id="save"
                  isIconOnly
                  aria-label="Save normalization regions"
                  isDisabled={
                    !normDraftDirty || updateNormalizationMetadata.isPending
                  }
                  className={plotToolbarGlyphToggleGroupItemHorizontalClass}
                >
                  <ToggleButtonGroup.Separator />
                  <Save className="h-5 w-5" aria-hidden />
                </ToggleButton>
                <Tooltip delay={0}>
                  <ToggleButton
                    id="reset"
                    isIconOnly
                    aria-label="Reset pre and post normalization regions to defaults"
                    isDisabled={normResetDisabled}
                    className={plotToolbarGlyphToggleGroupItemHorizontalClass}
                  >
                    <ToggleButtonGroup.Separator />
                    <RotateCcw className="h-4 w-4" aria-hidden />
                  </ToggleButton>
                  <Tooltip.Content
                    placement="bottom"
                    className="bg-foreground text-background max-w-xs rounded-lg px-3 py-2 text-xs shadow-lg"
                  >
                    Restore draft pre/post windows from the spectrum defaults.
                  </Tooltip.Content>
                </Tooltip>
              </>
            ) : null}
          </ToggleButtonGroup>
        </>
      ) : null,
    [
      datasetPlotEditorAvailable,
      datasetPlotEditorActive,
      editSaveToolbarSelectedKeys,
      handleEditSaveToolbarSelectionChange,
      normDraftDirty,
      normResetDisabled,
      updateNormalizationMetadata.isPending,
    ],
  );

  const plotLeftRail = useMemo(
    () => (
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
                ? "Bare atom overlay (not available in optical density view)"
                : chemicalFormula
                  ? model.dataView === "delta"
                    ? "Bare atom delta reference (KK from Henke beta on this grid)"
                    : "Bare atom reference curve on this energy grid"
                  : "Bare atom overlay (no chemical formula on linked molecule)"
            }
            id="bare-atom"
            isDisabled={
              !chemicalFormula ||
              model.dataView === "od" ||
              (model.dataView === "delta" && !model.deltaAvailable) ||
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
            else if (next === "delta") model.setDataView("delta");
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
          <ToggleButton
            isIconOnly
            aria-label="Delta refractive decrement from stored values"
            id="delta"
            isDisabled={!model.deltaAvailable}
            className={plotToolbarBasisToggleClass}
          >
            <ToggleButtonGroup.Separator />
            <span className="text-sm font-semibold" aria-hidden>
              &#x03B4;
            </span>
          </ToggleButton>
        </ToggleButtonGroup>
      </Toolbar>
      {datasetPlotEditorActive ? (
        <PlotSpectrumToolsToolbarSection
          peakToolsEnabled={false}
          normalizationRegionResetInRail={false}
          isNormalizationMode={isPlotNormalizationMode}
          onNormalizationModeChange={handlePlotNormalizationMode}
          activeEdge={normalizationSelectionTarget ?? "pre"}
          onActiveEdgeChange={(edge) => setNormalizationSelectionTarget(edge)}
          onResetToDefaultRegions={handleResetDraftNormRegions}
          normalizationLocked={false}
          hasData={sortedAllPoints.length > 0}
          isPeakSetMode={false}
          onPeakSetModeChange={() => undefined}
          peakCount={0}
          onAutoDetectPeaks={() => undefined}
          onResetAllPeaks={() => undefined}
        />
      ) : null}
      {datasetPlotEditorActive &&
      kkRecalcAllowed &&
      showBetaCol &&
      !pointsQuery.isLoading ? (
        <Toolbar
          isAttached
          orientation="vertical"
          aria-label="Kramers Kronig delta tools"
          className={`${plotToolbarAttachedShellClass} flex w-fit flex-col gap-2`}
        >
          <Tooltip delay={0}>
            <Button
              type="button"
              aria-label="Recalculate Kramers Kronig delta from stored beta"
              variant="secondary"
              isDisabled={kkRecalcBusy || updateKkDeltaBatch.isPending}
              onPress={onPressRecalculateKk}
              className={`${plotToolbarGlyphToggleStandaloneClass} text-xs font-semibold`}
            >
              KK
            </Button>
            <Tooltip.Content
              placement="right"
              className="bg-foreground text-background max-w-xs rounded-lg px-3 py-2 text-xs shadow-lg"
            >
              Recompute delta from stored beta in your browser (session
              consent required once), then persist for this experiment when
              permitted.
            </Tooltip.Content>
          </Tooltip>
          <Tooltip delay={0}>
            <Button
              type="button"
              isIconOnly
              aria-label="Reset Kramers Kronig delta and redo calculation"
              variant="secondary"
              isDisabled={kkRecalcBusy || updateKkDeltaBatch.isPending}
              onPress={onPressResetKk}
              className={plotToolbarGlyphToggleStandaloneClass}
            >
              <RotateCcw className="h-4 w-4" aria-hidden />
            </Button>
            <Tooltip.Content
              placement="right"
              className="bg-foreground text-background max-w-xs rounded-lg px-3 py-2 text-xs shadow-lg"
            >
              Discard any transient KK state for this session and rerun the
              same Kramers Kronig pipeline from stored beta.
            </Tooltip.Content>
          </Tooltip>
        </Toolbar>
      ) : null}
    </div>
    ),
    [
      datasetPlotEditorActive,
      isPlotNormalizationMode,
      normalizationSelectionTarget,
      handlePlotNormalizationMode,
      handleResetDraftNormRegions,
      sortedAllPoints.length,
      diffBareSelectedKeys,
      handleDiffBareSelectionChange,
      model,
      chemicalFormula,
      moleculeFormulaQuery.isLoading,
      overlaySelectedKey,
      kkRecalcAllowed,
      showBetaCol,
      pointsQuery.isLoading,
      kkRecalcBusy,
      updateKkDeltaBatch.isPending,
      onPressRecalculateKk,
      onPressResetKk,
    ],
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
      <KkBrowserConsentDialog
        isOpen={kkPanelConsentOpen}
        onDismiss={() => setKkPanelConsentOpen(false)}
        onAccept={onPanelKkConsentAccept}
      />

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
              points={spectrumPlotPoints}
              graphStyle={graphStyle}
              yAxisQuantity={model.spectrumYAxisQuantity}
              referenceCurves={referenceCurves}
              normalizationRegions={
                datasetPlotEditorActive ? draftNormRegions : undefined
              }
              showNormalizationShading={
                datasetPlotEditorActive && isPlotNormalizationMode
              }
              normalizationEdgeHandlesEnabled={
                datasetPlotEditorActive &&
                isPlotNormalizationMode &&
                draftNormRegions.pre != null &&
                draftNormRegions.post != null
              }
              onNormalizationEdgeEnergyChange={
                datasetPlotEditorActive
                  ? handleBrowseNormalizationEdgeDrag
                  : undefined
              }
              plotContext={
                datasetPlotEditorActive &&
                isPlotNormalizationMode &&
                normalizationSelectionTarget
                  ? {
                      kind: "normalize",
                      target: normalizationSelectionTarget,
                    }
                  : { kind: "explore" }
              }
              onSelectionChange={
                datasetPlotEditorActive && isPlotNormalizationMode
                  ? handleNormalizationDraftSelection
                  : undefined
              }
              peaks={plotPeaks}
              differenceSpectra={differenceSpectra}
              showThetaData={showThetaData}
              showPhiData={showPhiData}
              headerRight={plotLeftRail}
              plotTopRailDataActions={plotTopRailDataActions}
              plotTopRailTrailingActions={plotTopRailTrailingActions}
              cursorMode={cursorMode}
              onCursorModeChange={setCursorMode}
              emptyStateMessage="No points in this view."
            />
            {datasetPlotEditorActive ? (
              <div className="border-border bg-surface mt-3 flex flex-col gap-2 rounded-lg border p-3">
                {isPlotNormalizationMode && normalizationSelectionTarget ? (
                  <div
                    className={
                      normalizationSelectionTarget === "pre"
                        ? "rounded-md border border-blue-500/35 bg-blue-500/10 p-2 text-xs text-blue-900 dark:text-blue-100"
                        : "rounded-md border border-emerald-500/35 bg-emerald-500/10 p-2 text-xs text-emerald-900 dark:text-emerald-100"
                    }
                  >
                    <div className="flex items-center gap-2">
                      <PencilIcon className="h-4 w-4 shrink-0" aria-hidden />
                      <span>
                        {normalizationSelectionTarget === "pre"
                          ? "Drag on the plot to set the pre-edge window (beta normalization channel)."
                          : "Drag on the plot to set the post-edge window (beta normalization channel)."}
                      </span>
                    </div>
                  </div>
                ) : null}
                <div className="flex flex-wrap items-center justify-end gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="tertiary"
                    onPress={endDatasetPlotEditor}
                  >
                    Done
                  </Button>
                </div>
              </div>
            ) : null}
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
          showDeltaCol={showDeltaCol}
          showI0Col={showI0Col}
        />
      )}
    </div>
  );
}
