/**
 * Geometry pairing and plot-model helpers for the contribute similarity
 * comparison modal (upload vs matched Atlas experiment).
 *
 * Does not score energy-span similarity — that lives in {@link dataset-similarity}.
 * Aligns upload and existing traces onto a shared physical channel before overlay
 * and residual math so OD is never compared against rawabs-scale values. Residuals
 * are endpoint-normalized onto the shared energy overlap (first/last anchors) so
 * contributor normalization windows cancel out of the shape comparison.
 */

import {
  buildGeometryLabel,
  groupPointsByGeometry,
  sortedGeometryGroupEntries,
} from "~/components/plots/utils/trace-utils";
import type {
  DifferenceSpectrum,
  SpectrumPoint,
} from "~/components/plots/types";
import { interpolateMakimaSorted } from "~/features/kk-calc/makima-interpolate";
import { spectrumGeometryKeyFromPoint } from "~/lib/nexafs/spectrum-geometry-key";

/** How one geometry key relates between upload and existing experiment. */
export type GeometryPairingKind =
  | "matched"
  | "upload_only"
  | "existing_only";

/** One geometry row for the similarity compare UI. */
export interface GeometryPairingRow {
  /** Canonical `theta:phi` or `fixed` key. */
  key: string;
  /** Human-readable θ/φ label. */
  label: string;
  /** Whether both sides share this geometry, or only one side. */
  kind: GeometryPairingKind;
}

/**
 * Physical y-channel used for overlay and residual comparison when both sides
 * expose enough finite samples.
 */
export type SimilarityCompareChannel =
  | "massabsorption"
  | "od"
  | "rawabs"
  | "absorption";

/** Plot inputs for overlaying upload traces on an existing experiment. */
export interface SimilarityComparePlotModel {
  /** Existing experiment points (primary SpectrumPlot traces, solid). */
  existingPoints: SpectrumPoint[];
  /**
   * Upload points projected onto {@link compareChannel} for solid-only upload
   * view (Existing / Upload / Overlay source control).
   */
  uploadPoints: SpectrumPoint[];
  /** Upload geometries as dashed companion overlays. */
  uploadCompanions: DifferenceSpectrum[];
  /** Geometry pairing summary for mismatch copy. */
  pairings: GeometryPairingRow[];
  /**
   * Shared channel used to set `absorption` on both sides, or `null` when no
   * channel has enough finite samples on both datasets.
   */
  compareChannel: SimilarityCompareChannel | null;
}

/** Residual statistics for one matched (θ, φ) pair after remapping upload onto the existing energy grid. */
export interface GeometryResidualSummary {
  /** Canonical geometry key. */
  key: string;
  /** Human-readable θ/φ label. */
  label: string;
  /** Root-mean-square of upload − existing on shared samples. */
  rmse: number;
  /**
   * RMSE divided by the existing-trace amplitude
   * (`max(ε, existingMax − existingMin)`), in `[0, ∞)`.
   */
  nrmse: number;
  /** Mean absolute residual. */
  mae: number;
  /** Peak absolute residual. */
  maxAbs: number;
  /** Number of finite residual samples. */
  sampleCount: number;
  /** Residual spectrum (upload − existing) for the subplot. */
  residualSpectrum: DifferenceSpectrum;
}

/**
 * Geometry filter for the compare plot: the literal `"all"`, or a geometry key
 * from {@link GeometryPairingRow.key}.
 */
export type SimilarityGeometrySelection = string;

/** Minimum finite samples required on each side before a channel is usable. */
const MIN_CHANNEL_SAMPLES = 2;

/** Floor for existing-trace amplitude when computing NRMSE. */
const NRMSE_AMPLITUDE_EPSILON = 1e-12;

/** NRMSE above this (unit interval) is labeled a poor waveform match in UI copy. */
export const SIMILARITY_WAVEFORM_POOR_NRMSE = 0.25;

const COMPARE_CHANNEL_PRIORITY: readonly SimilarityCompareChannel[] = [
  "massabsorption",
  "od",
  "rawabs",
  "absorption",
] as const;

/**
 * Collects unique geometry keys from spectrum points in stable θ-then-φ order.
 *
 * @param points - Spectrum rows that may carry finite `theta` / `phi`.
 * @returns Ordered unique geometry keys.
 */
export function orderedGeometryKeysFromPoints(
  points: readonly SpectrumPoint[],
): string[] {
  return sortedGeometryGroupEntries(groupPointsByGeometry([...points])).map(
    ([key]) => key,
  );
}

/**
 * Reads the finite numeric value for a compare channel on one spectrum point.
 *
 * @param point - Spectrum row that may carry channel-specific fields.
 * @param channel - Channel to read.
 * @returns Finite value, or `null` when missing / non-finite.
 */
export function similarityCompareChannelValue(
  point: SpectrumPoint,
  channel: SimilarityCompareChannel,
): number | null {
  switch (channel) {
    case "massabsorption":
      return point.massabsorption != null &&
        Number.isFinite(point.massabsorption)
        ? point.massabsorption
        : null;
    case "od":
      return point.od != null && Number.isFinite(point.od) ? point.od : null;
    case "rawabs":
      return point.rawabs != null && Number.isFinite(point.rawabs)
        ? point.rawabs
        : null;
    case "absorption":
      return Number.isFinite(point.absorption) ? point.absorption : null;
    default: {
      const _exhaustive: never = channel;
      return _exhaustive;
    }
  }
}

/**
 * Counts points with a finite value for `channel`.
 *
 * @param points - Spectrum rows to scan.
 * @param channel - Channel to count.
 * @returns Finite sample count.
 */
export function countFiniteCompareChannelSamples(
  points: readonly SpectrumPoint[],
  channel: SimilarityCompareChannel,
): number {
  let count = 0;
  for (const point of points) {
    if (similarityCompareChannelValue(point, channel) != null) {
      count += 1;
    }
  }
  return count;
}

/**
 * Picks the preferred y-channel that has enough finite samples on both upload
 * and existing spectra (`massabsorption` → `od` → `rawabs` → `absorption`).
 *
 * @param uploadPoints - Incoming contribute spectrum points.
 * @param existingPoints - Persisted spectrum points for the matched experiment.
 * @returns Shared channel, or `null` when none qualify.
 */
export function pickSharedCompareChannel(
  uploadPoints: readonly SpectrumPoint[],
  existingPoints: readonly SpectrumPoint[],
): SimilarityCompareChannel | null {
  for (const channel of COMPARE_CHANNEL_PRIORITY) {
    if (
      countFiniteCompareChannelSamples(uploadPoints, channel) >=
        MIN_CHANNEL_SAMPLES &&
      countFiniteCompareChannelSamples(existingPoints, channel) >=
        MIN_CHANNEL_SAMPLES
    ) {
      return channel;
    }
  }
  return null;
}

/**
 * Copies points with `absorption` set from `channel`, dropping rows that lack
 * a finite channel value.
 *
 * @param points - Source spectrum rows.
 * @param channel - Channel to project onto `absorption`.
 * @returns New points suitable for overlay / residual math.
 */
export function projectPointsForCompare(
  points: readonly SpectrumPoint[],
  channel: SimilarityCompareChannel,
): SpectrumPoint[] {
  const out: SpectrumPoint[] = [];
  for (const point of points) {
    const value = similarityCompareChannelValue(point, channel);
    if (value == null) {
      continue;
    }
    out.push({ ...point, absorption: value });
  }
  return out;
}

/**
 * Short label for the shared compare channel (UI captions).
 *
 * @param channel - Shared channel, or `null` when none.
 * @returns Display string such as `OD` or `—`.
 */
export function similarityCompareChannelLabel(
  channel: SimilarityCompareChannel | null,
): string {
  switch (channel) {
    case "massabsorption":
      return "μ";
    case "od":
      return "OD";
    case "rawabs":
      return "raw";
    case "absorption":
      return "absorption";
    case null:
      return "—";
    default: {
      const _exhaustive: never = channel;
      return _exhaustive;
    }
  }
}

/**
 * Builds a side-by-side geometry pairing list for upload vs existing spectra.
 *
 * Matched keys appear first (θ/φ ascending), then upload-only, then
 * existing-only. Callers use `kind` to highlight polarization mismatches.
 *
 * @param uploadPoints - Incoming contribute spectrum points.
 * @param existingPoints - Persisted spectrum points for the matched experiment.
 * @returns Ordered pairing rows covering the union of geometries.
 */
export function pairGeometriesForSimilarityCompare(
  uploadPoints: readonly SpectrumPoint[],
  existingPoints: readonly SpectrumPoint[],
): GeometryPairingRow[] {
  const uploadGroups = groupPointsByGeometry([...uploadPoints]);
  const existingGroups = groupPointsByGeometry([...existingPoints]);
  const uploadKeys = new Set(uploadGroups.keys());
  const existingKeys = new Set(existingGroups.keys());
  const allKeys = new Set([...uploadKeys, ...existingKeys]);

  const rows: GeometryPairingRow[] = [];
  for (const key of allKeys) {
    const sample =
      uploadGroups.get(key) ?? existingGroups.get(key) ?? undefined;
    const label = sample
      ? sample.label
      : buildGeometryLabel(undefined, undefined);
    const inUpload = uploadKeys.has(key);
    const inExisting = existingKeys.has(key);
    let kind: GeometryPairingKind;
    if (inUpload && inExisting) {
      kind = "matched";
    } else if (inUpload) {
      kind = "upload_only";
    } else {
      kind = "existing_only";
    }
    rows.push({ key, label, kind });
  }

  rows.sort((a, b) => {
    const kindRank = (kind: GeometryPairingKind): number => {
      switch (kind) {
        case "matched":
          return 0;
        case "upload_only":
          return 1;
        case "existing_only":
          return 2;
        default: {
          const _exhaustive: never = kind;
          return _exhaustive;
        }
      }
    };
    const rankDiff = kindRank(a.kind) - kindRank(b.kind);
    if (rankDiff !== 0) {
      return rankDiff;
    }
    return a.label.localeCompare(b.label);
  });

  return rows;
}

/**
 * Partitions points into per-geometry arrays keyed by {@link spectrumGeometryKeyFromPoint}.
 *
 * @param points - Spectrum points to group.
 * @returns Map from geometry key to points in input order within each group.
 */
export function partitionPointsByGeometry(
  points: readonly SpectrumPoint[],
): Map<string, SpectrumPoint[]> {
  const map = new Map<string, SpectrumPoint[]>();
  for (const point of points) {
    const key = spectrumGeometryKeyFromPoint(point);
    const list = map.get(key);
    if (list) {
      list.push(point);
    } else {
      map.set(key, [point]);
    }
  }
  return map;
}

/**
 * Builds SpectrumPlot primary + companion inputs after aligning both sides onto
 * a shared compare channel when possible.
 *
 * Existing experiment points are the solid primary traces. Each upload geometry
 * becomes a dashed companion labeled `Upload · …`.
 *
 * @param uploadPoints - Incoming contribute spectrum.
 * @param existingPoints - Matched DB experiment spectrum.
 * @returns Plot model plus geometry pairing rows and the chosen channel.
 */
export function buildSimilarityComparePlotModel(
  uploadPoints: readonly SpectrumPoint[],
  existingPoints: readonly SpectrumPoint[],
): SimilarityComparePlotModel {
  const compareChannel = pickSharedCompareChannel(
    uploadPoints,
    existingPoints,
  );
  const alignedUpload = compareChannel
    ? projectPointsForCompare(uploadPoints, compareChannel)
    : [...uploadPoints];
  const alignedExisting = compareChannel
    ? projectPointsForCompare(existingPoints, compareChannel)
    : [...existingPoints];

  const pairings = pairGeometriesForSimilarityCompare(
    alignedUpload,
    alignedExisting,
  );
  const uploadByGeometry = partitionPointsByGeometry(alignedUpload);
  const uploadCompanions: DifferenceSpectrum[] = [];

  for (const pairing of pairings) {
    if (pairing.kind === "existing_only") {
      continue;
    }
    const points = uploadByGeometry.get(pairing.key);
    if (!points || points.length === 0) {
      continue;
    }
    uploadCompanions.push({
      label: `Upload · ${pairing.label}`,
      points,
      legendId: `upload-${pairing.key}`,
      lineDash: "dash",
      lineWidth: 2,
    });
  }

  return {
    existingPoints: alignedExisting,
    uploadPoints: alignedUpload,
    uploadCompanions,
    pairings,
    compareChannel,
  };
}

/**
 * Formats a closed energy span for comparison chrome.
 *
 * @param minEv - Lower bound (eV).
 * @param maxEv - Upper bound (eV).
 * @returns Compact string such as `271–330 eV`, or `—` when non-finite.
 */
export function formatEnergySpanEv(minEv: number, maxEv: number): string {
  if (!Number.isFinite(minEv) || !Number.isFinite(maxEv)) {
    return "—";
  }
  return `${Math.round(minEv)}–${Math.round(maxEv)} eV`;
}

function strictlyAscendingFiniteSamples(
  points: readonly SpectrumPoint[],
): { energies: number[]; values: number[] } | null {
  const sorted = [...points]
    .filter(
      (point) =>
        Number.isFinite(point.energy) && Number.isFinite(point.absorption),
    )
    .sort((a, b) => a.energy - b.energy);
  if (sorted.length < 2) {
    return null;
  }
  const energies: number[] = [];
  const values: number[] = [];
  for (const point of sorted) {
    const last = energies[energies.length - 1];
    if (last != null && point.energy <= last) {
      continue;
    }
    energies.push(point.energy);
    values.push(point.absorption);
  }
  if (energies.length < 2) {
    return null;
  }
  return { energies, values };
}

function interpolateLinearSorted(
  energies: readonly number[],
  values: readonly number[],
  target: number,
): number | null {
  if (energies.length === 0 || energies.length !== values.length) {
    return null;
  }
  if (target < energies[0]! || target > energies[energies.length - 1]!) {
    return null;
  }
  let lo = 0;
  let hi = energies.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (energies[mid]! <= target) {
      lo = mid;
    } else {
      hi = mid;
    }
  }
  const e0 = energies[lo]!;
  const e1 = energies[hi]!;
  const v0 = values[lo]!;
  const v1 = values[hi]!;
  if (e1 === e0) {
    return v0;
  }
  const t = (target - e0) / (e1 - e0);
  return v0 + t * (v1 - v0);
}

/**
 * Affine-maps a spectrum so its values at shared endpoint energies `loEv` and
 * `hiEv` become 0 and 1. Removes absolute scale/offset so residuals compare
 * shape independent of contributor normalization windows.
 *
 * @param points - Channel-aligned spectrum points for one geometry.
 * @param loEv - Shared lower energy anchor (eV).
 * @param hiEv - Shared upper energy anchor (eV).
 * @returns Endpoint-normalized points, or `null` when anchors cannot be sampled.
 */
export function endpointNormalizeOntoSharedEnergies(
  points: readonly SpectrumPoint[],
  loEv: number,
  hiEv: number,
): SpectrumPoint[] | null {
  const samples = strictlyAscendingFiniteSamples(points);
  if (!samples || !(hiEv > loEv)) {
    return null;
  }
  const yLo = interpolateLinearSorted(samples.energies, samples.values, loEv);
  const yHi = interpolateLinearSorted(samples.energies, samples.values, hiEv);
  if (yLo == null || yHi == null || !Number.isFinite(yLo) || !Number.isFinite(yHi)) {
    return null;
  }
  const denom = yHi - yLo;
  const out: SpectrumPoint[] = [];
  for (let i = 0; i < samples.energies.length; i++) {
    const energy = samples.energies[i]!;
    if (energy < loEv || energy > hiEv) {
      continue;
    }
    const raw = samples.values[i]!;
    const absorption =
      Math.abs(denom) < NRMSE_AMPLITUDE_EPSILON ? 0 : (raw - yLo) / denom;
    out.push({ energy, absorption });
  }
  return out.length >= 2 ? out : null;
}

/**
 * Computes upload − existing residuals for one matched geometry after
 * endpoint-normalizing both traces onto the shared energy overlap (first/last
 * anchors), then remapping upload onto the existing energy grid.
 *
 * Callers must pass points already projected onto the same compare channel.
 *
 * @param uploadPoints - Upload points for a single geometry.
 * @param existingPoints - Existing Atlas points for the same geometry.
 * @param geometryKey - Canonical key used in residual legend ids.
 * @param geometryLabel - Display label for the residual trace.
 * @returns Residual summary, or `null` when either side lacks enough samples.
 */
export function computeGeometryResidualSummary(
  uploadPoints: readonly SpectrumPoint[],
  existingPoints: readonly SpectrumPoint[],
  geometryKey: string,
  geometryLabel: string,
): GeometryResidualSummary | null {
  const upload = strictlyAscendingFiniteSamples(uploadPoints);
  const existing = strictlyAscendingFiniteSamples(existingPoints);
  if (!upload || !existing) {
    return null;
  }

  const lo = Math.max(upload.energies[0]!, existing.energies[0]!);
  const hi = Math.min(
    upload.energies[upload.energies.length - 1]!,
    existing.energies[existing.energies.length - 1]!,
  );
  if (!(hi > lo)) {
    return null;
  }

  const uploadNorm = endpointNormalizeOntoSharedEnergies(uploadPoints, lo, hi);
  const existingNorm = endpointNormalizeOntoSharedEnergies(
    existingPoints,
    lo,
    hi,
  );
  if (!uploadNorm || !existingNorm) {
    return null;
  }

  const uploadSamples = strictlyAscendingFiniteSamples(uploadNorm);
  const existingSamples = strictlyAscendingFiniteSamples(existingNorm);
  if (!uploadSamples || !existingSamples) {
    return null;
  }

  const targetEnergies: number[] = [];
  const existingValues: number[] = [];
  for (let i = 0; i < existingSamples.energies.length; i++) {
    const energy = existingSamples.energies[i]!;
    if (energy < lo || energy > hi) {
      continue;
    }
    targetEnergies.push(energy);
    existingValues.push(existingSamples.values[i]!);
  }
  if (targetEnergies.length < 2) {
    return null;
  }

  let uploadOnExisting: number[];
  try {
    uploadOnExisting = interpolateMakimaSorted(
      targetEnergies,
      uploadSamples.energies,
      uploadSamples.values,
    );
  } catch {
    uploadOnExisting = targetEnergies.map((energy) => {
      const value = interpolateLinearSorted(
        uploadSamples.energies,
        uploadSamples.values,
        energy,
      );
      return value ?? Number.NaN;
    });
  }

  const residualPoints: SpectrumPoint[] = [];
  let sumSq = 0;
  let sumAbs = 0;
  let maxAbs = 0;
  let sampleCount = 0;
  for (let i = 0; i < targetEnergies.length; i++) {
    const uploadValue = uploadOnExisting[i];
    const existingValue = existingValues[i];
    if (
      uploadValue == null ||
      existingValue == null ||
      !Number.isFinite(uploadValue) ||
      !Number.isFinite(existingValue)
    ) {
      continue;
    }
    const delta = uploadValue - existingValue;
    residualPoints.push({
      energy: targetEnergies[i]!,
      absorption: delta,
    });
    sumSq += delta * delta;
    sumAbs += Math.abs(delta);
    maxAbs = Math.max(maxAbs, Math.abs(delta));
    sampleCount += 1;
  }
  if (sampleCount < 2 || residualPoints.length < 2) {
    return null;
  }

  const rmse = Math.sqrt(sumSq / sampleCount);
  // Endpoint-normalized traces span ~[0, 1]; use unit amplitude for NRMSE.
  const nrmse = rmse / Math.max(NRMSE_AMPLITUDE_EPSILON, 1);

  return {
    key: geometryKey,
    label: geometryLabel,
    rmse,
    nrmse,
    mae: sumAbs / sampleCount,
    maxAbs,
    sampleCount,
    residualSpectrum: {
      label: `Residual · ${geometryLabel}`,
      points: residualPoints,
      legendId: `residual-${geometryKey}`,
      color: "var(--muted)",
      lineDash: "solid",
      lineWidth: 1.5,
    },
  };
}

/**
 * Builds residual summaries for every matched geometry between upload and existing spectra.
 *
 * Aligns both sides onto {@link pickSharedCompareChannel} before residual math.
 * Returns an empty array when no shared channel exists.
 *
 * @param uploadPoints - Incoming contribute spectrum.
 * @param existingPoints - Matched DB experiment spectrum.
 * @returns One summary per matched geometry that has enough overlapping samples.
 */
export function computeMatchedGeometryResiduals(
  uploadPoints: readonly SpectrumPoint[],
  existingPoints: readonly SpectrumPoint[],
): GeometryResidualSummary[] {
  const compareChannel = pickSharedCompareChannel(
    uploadPoints,
    existingPoints,
  );
  if (compareChannel == null) {
    return [];
  }
  const alignedUpload = projectPointsForCompare(uploadPoints, compareChannel);
  const alignedExisting = projectPointsForCompare(
    existingPoints,
    compareChannel,
  );
  const pairings = pairGeometriesForSimilarityCompare(
    alignedUpload,
    alignedExisting,
  );
  const uploadByGeometry = partitionPointsByGeometry(alignedUpload);
  const existingByGeometry = partitionPointsByGeometry(alignedExisting);
  const summaries: GeometryResidualSummary[] = [];
  for (const pairing of pairings) {
    if (pairing.kind !== "matched") {
      continue;
    }
    const upload = uploadByGeometry.get(pairing.key);
    const existing = existingByGeometry.get(pairing.key);
    if (!upload || !existing) {
      continue;
    }
    const summary = computeGeometryResidualSummary(
      upload,
      existing,
      pairing.key,
      pairing.label,
    );
    if (summary) {
      summaries.push(summary);
    }
  }
  return summaries;
}

/**
 * Median NRMSE across residual summaries (unit interval), or `null` when empty.
 *
 * @param summaries - Per-geometry residual rows.
 * @returns Median NRMSE, or `null`.
 */
export function medianGeometryNrmse(
  summaries: readonly GeometryResidualSummary[],
): number | null {
  if (summaries.length === 0) {
    return null;
  }
  const values = [...summaries.map((row) => row.nrmse)].sort((a, b) => a - b);
  const mid = Math.floor(values.length / 2);
  if (values.length % 2 === 1) {
    return values[mid] ?? null;
  }
  const lo = values[mid - 1];
  const hi = values[mid];
  if (lo == null || hi == null) {
    return null;
  }
  return (lo + hi) / 2;
}

/**
 * Filters a similarity plot model to one geometry key, or returns the full model for `all`.
 *
 * @param model - Full overlay model from {@link buildSimilarityComparePlotModel}.
 * @param selection - `all` or a geometry key.
 * @returns Narrowed plot model for SpectrumPlot.
 */
export function filterSimilarityComparePlotModel(
  model: SimilarityComparePlotModel,
  selection: SimilarityGeometrySelection,
): SimilarityComparePlotModel {
  if (selection === "all") {
    return model;
  }
  const existingPoints = model.existingPoints.filter(
    (point) => spectrumGeometryKeyFromPoint(point) === selection,
  );
  const uploadPoints = model.uploadPoints.filter(
    (point) => spectrumGeometryKeyFromPoint(point) === selection,
  );
  const uploadCompanions = model.uploadCompanions.filter(
    (companion) => companion.legendId === `upload-${selection}`,
  );
  const pairings = model.pairings.filter((row) => row.key === selection);
  return {
    existingPoints,
    uploadPoints,
    uploadCompanions,
    pairings,
    compareChannel: model.compareChannel,
  };
}

/**
 * Formats a residual magnitude for compact chip / caption chrome.
 *
 * @param value - Non-negative residual statistic.
 * @returns Short scientific-friendly string.
 */
export function formatResidualStat(value: number): string {
  if (!Number.isFinite(value)) {
    return "—";
  }
  const abs = Math.abs(value);
  if (abs >= 100) {
    return abs.toFixed(0);
  }
  if (abs >= 10) {
    return abs.toFixed(1);
  }
  if (abs >= 1) {
    return abs.toFixed(2);
  }
  if (abs >= 0.01) {
    return abs.toFixed(3);
  }
  return abs.toExponential(1);
}

/**
 * Formats unit-interval NRMSE as a percent string for captions.
 *
 * @param nrmse - Normalized RMSE in `[0, ∞)`.
 * @returns Percent text such as `12%`, or `—` when non-finite.
 */
export function formatNrmsePercent(nrmse: number): string {
  if (!Number.isFinite(nrmse) || nrmse < 0) {
    return "—";
  }
  const pct = nrmse * 100;
  if (pct >= 100) {
    return `${Math.round(pct)}%`;
  }
  if (pct >= 10) {
    return `${pct.toFixed(0)}%`;
  }
  if (pct >= 1) {
    return `${pct.toFixed(1)}%`;
  }
  return `${pct.toFixed(2)}%`;
}
