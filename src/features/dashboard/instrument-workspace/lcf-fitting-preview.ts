import type { DifferenceSpectrum, SpectrumPoint } from "~/components/plots/types";
import {
  buildLcfPlotOverlay,
  lcfEnergyOverlapRange,
  normalizeLcfInitialWeights,
  type LcfSpectrum,
} from "~/lib/stxm/lcf";

export type LcfPlotOverlay = ReturnType<typeof buildLcfPlotOverlay>;

export const LCF_TARGET_TRACE_ID = "lcf-target";
export const LCF_MODEL_TRACE_ID = "lcf-model";
export const LCF_RESIDUAL_TRACE_ID = "lcf-residual";

/**
 * Returns the stable legend id for one LCF standard/component trace at `index`.
 */
export function lcfComponentTraceId(index: number): string {
  return `lcf-component-${index}`;
}

function toPlotPoints(
  energyGrid: readonly number[],
  values: readonly number[],
): SpectrumPoint[] {
  return energyGrid
    .map((energy, index) => ({
      energy,
      absorption: values[index] ?? Number.NaN,
    }))
    .filter((point) => Number.isFinite(point.absorption));
}

export type LcfPlotTraceVisibilityRow = {
  readonly id: string;
  readonly label: string;
};

export type LcfPlotSeries = {
  readonly targetPoints: SpectrumPoint[];
  readonly companions: DifferenceSpectrum[];
  readonly residual: DifferenceSpectrum;
  readonly visibilityRows: readonly LcfPlotTraceVisibilityRow[];
};

export type BuildLcfPlotSeriesParams = {
  readonly overlay: LcfPlotOverlay;
  readonly componentSpectra: readonly LcfSpectrum[];
  readonly fractions: readonly number[];
  readonly componentColors: readonly string[];
};

/**
 * Builds main and residual plot series from an LC overlay, keeping the residual out of the main-panel companions list.
 */
export function buildLcfPlotSeries(
  params: BuildLcfPlotSeriesParams,
): LcfPlotSeries {
  const { overlay, componentSpectra, fractions, componentColors } = params;
  const targetPoints = toPlotPoints(overlay.energyGrid, overlay.targetOnGrid);
  const modelPoints = toPlotPoints(overlay.energyGrid, overlay.model);
  const residualPoints = toPlotPoints(overlay.energyGrid, overlay.residual);
  const companions: DifferenceSpectrum[] = [
    {
      label: "Fitted sum",
      points: modelPoints,
      color: "var(--accent)",
      legendId: LCF_MODEL_TRACE_ID,
    },
    ...componentSpectra.map((spectrum, index) => ({
      label:
        componentSpectra.length === 1
          ? `${spectrum.label} (scale ${(fractions[index] ?? 0).toFixed(3)})`
          : `${spectrum.label} (${((fractions[index] ?? 0) * 100).toFixed(1)}%)`,
      points: toPlotPoints(
        overlay.energyGrid,
        overlay.scaledComponents[index] ?? [],
      ),
      color: componentColors[index % componentColors.length]!,
      legendId: lcfComponentTraceId(index),
    })),
  ];
  const residual: DifferenceSpectrum = {
    label: "Residual (target - fit)",
    points: residualPoints,
    color: "var(--muted)",
    legendId: LCF_RESIDUAL_TRACE_ID,
  };
  const visibilityRows: LcfPlotTraceVisibilityRow[] = [
    { id: LCF_TARGET_TRACE_ID, label: "Target" },
    { id: LCF_MODEL_TRACE_ID, label: "Fitted sum" },
    ...componentSpectra.map((spectrum, index) => ({
      id: lcfComponentTraceId(index),
      label: spectrum.label,
    })),
    { id: LCF_RESIDUAL_TRACE_ID, label: "Residual" },
  ];
  return {
    targetPoints,
    companions,
    residual,
    visibilityRows,
  };
}

/**
 * Filters LCF plot series by hidden legend ids; never removes every main-panel trace.
 */
export function filterLcfPlotSeriesByHiddenIds(
  series: LcfPlotSeries,
  hiddenTraceIds: readonly string[],
): {
  targetPoints: SpectrumPoint[];
  companions: DifferenceSpectrum[];
  residual: DifferenceSpectrum | null;
} {
  if (hiddenTraceIds.length === 0) {
    return {
      targetPoints: series.targetPoints,
      companions: series.companions,
      residual: series.residual,
    };
  }
  const hidden = new Set(hiddenTraceIds);
  const targetHidden = hidden.has(LCF_TARGET_TRACE_ID);
  const residualHidden = hidden.has(LCF_RESIDUAL_TRACE_ID);
  const visibleCompanions = series.companions.filter(
    (companion) =>
      companion.legendId == null || !hidden.has(companion.legendId),
  );
  const targetPoints = targetHidden ? [] : series.targetPoints;
  const hasMainPanelTrace =
    targetPoints.length > 0 || visibleCompanions.length > 0;
  return {
    targetPoints: hasMainPanelTrace ? targetPoints : series.targetPoints,
    companions: hasMainPanelTrace ? visibleCompanions : series.companions,
    residual: residualHidden ? null : series.residual,
  };
}

/**
 * Parses optional fit-window energy bounds from text fields.
 */
export function parseLcfEnergyRange(
  energyMinEv: string,
  energyMaxEv: string,
): { min: number | null; max: number | null } {
  const parsedMin =
    energyMinEv.trim() === "" ? null : Number.parseFloat(energyMinEv);
  const parsedMax =
    energyMaxEv.trim() === "" ? null : Number.parseFloat(energyMaxEv);
  return { min: parsedMin, max: parsedMax };
}

/**
 * Builds a sorted energy grid from union samples inside `[minEv, maxEv]`.
 */
export function buildLcfEnergyGridInRange(
  target: { energyEv: readonly number[] },
  references: readonly { energyEv: readonly number[] }[],
  minEv: number,
  maxEv: number,
): number[] {
  const energies = new Set<number>();
  for (const axis of [target, ...references]) {
    for (const energy of axis.energyEv) {
      if (Number.isFinite(energy) && energy >= minEv && energy <= maxEv) {
        energies.add(energy);
      }
    }
  }
  const grid = [...energies].sort((left, right) => left - right);
  if (grid.length >= 2) {
    return grid;
  }
  return Array.from({ length: 64 }, (_, index) => {
    const t = index / 63;
    return minEv + t * (maxEv - minEv);
  });
}

/**
 * Resolves the shared LCF energy grid, defaulting to target/reference overlap when fit bounds are unset or invalid.
 */
export function resolveLcfFitEnergyGrid(
  target: LcfSpectrum,
  references: readonly LcfSpectrum[],
  energyMinEv: string,
  energyMaxEv: string,
): number[] | undefined {
  const overlap = lcfEnergyOverlapRange(target, references);
  if (!overlap) {
    return undefined;
  }
  const { min, max } = parseLcfEnergyRange(energyMinEv, energyMaxEv);
  if (
    min != null &&
    max != null &&
    Number.isFinite(min) &&
    Number.isFinite(max) &&
    max > min
  ) {
    const lo = Math.max(min, overlap[0]);
    const hi = Math.min(max, overlap[1]);
    if (hi > lo) {
      return buildLcfEnergyGridInRange(target, references, lo, hi);
    }
  }
  return buildLcfEnergyGridInRange(target, references, overlap[0], overlap[1]);
}

/**
 * Returns a reader-facing message when the LC live preview cannot render, or `null` when overlay construction should proceed.
 */
export function describeLcfPlotPreviewUnavailable(params: {
  targetTraceKey: string | null;
  componentTraceKeys: readonly string[];
  targetSpectrum: LcfSpectrum | null;
  componentSpectra: readonly LcfSpectrum[];
  liveOverlay: LcfPlotOverlay | null;
}): string | null {
  if (!params.targetTraceKey) {
    return "Select a target spectrum to preview the fit overlay and residual.";
  }
  if (params.componentTraceKeys.length === 0) {
    return "Add at least one standard component to preview the fit overlay.";
  }
  if (!params.targetSpectrum) {
    return "Target spectrum data is unavailable. Re-reduce the scan on Ingestion or refresh the Preview spectra cache.";
  }
  if (params.componentSpectra.length < params.componentTraceKeys.length) {
    return "One or more standard spectra are unavailable in the cache. Check Preview spectra or pick different standards.";
  }
  if (!params.liveOverlay) {
    return "No overlapping energy range between target and standards for the selected channel. Try another channel or adjust the fit energy window.";
  }
  return null;
}

/**
 * Resolves slider weights for live LC preview: single-standard mode keeps scale as-is; multi-standard mode optionally normalizes to sum to one.
 *
 * @param componentWeights - Raw slider values stored in UI state.
 * @param componentCount - Number of resolved standard spectra on the fit grid.
 * @param sumToOne - When true with multiple components, normalizes fractions to sum to one.
 */
export function resolveLcfPreviewWeights(
  componentWeights: readonly number[],
  componentCount: number,
  sumToOne: boolean,
): number[] {
  const aligned = componentWeights.slice(0, componentCount);
  if (componentCount === 1) {
    return aligned.length > 0 ? [Math.max(0, aligned[0] ?? 1)] : [1];
  }
  return normalizeLcfInitialWeights(aligned, sumToOne);
}

/**
 * Selects plot legend fractions for live preview; manual slider weights always win over the last optimized fit.
 *
 * @param previewWeights - Weights derived from sliders via {@link resolveLcfPreviewWeights}.
 * @param optimizedFractions - Coefficients from the most recent explicit refine, if any.
 */
export function resolveLcfPlotLegendFractions(
  previewWeights: readonly number[],
  _optimizedFractions: readonly number[] | undefined,
): readonly number[] {
  return previewWeights;
}

/**
 * Builds the LC plot overlay for live preview, returning `null` instead of throwing when grids do not overlap.
 */
export function buildLcfLivePlotOverlay(
  target: LcfSpectrum,
  references: readonly LcfSpectrum[],
  fractions: readonly number[],
  energyGrid?: readonly number[],
): LcfPlotOverlay | null {
  try {
    return buildLcfPlotOverlay(target, references, fractions, energyGrid);
  } catch {
    return null;
  }
}
