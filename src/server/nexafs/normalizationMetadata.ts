import type { SpectrumPoint } from "~/components/plots/types";
import type {
  NormalizationRange,
  NormalizationRanges,
  NormalizationScope,
  PerChannelNormalizationRanges,
  UnifiedNormalizationRanges,
} from "~/features/process-nexafs/types";

export type UploadedChannel = "rawabs" | "od" | "massabsorption" | "beta";

export type {
  NormalizationRange,
  NormalizationRanges,
  NormalizationScope,
  UnifiedNormalizationRanges,
};

export type ChannelProvenanceStatus =
  | "uploaded_authoritative"
  | "derived"
  | "derived_with_assumptions"
  | "missing";

export type ChannelProvenance = Record<UploadedChannel, ChannelProvenanceStatus>;

export type ValidationCheckStatus = "pass" | "warn" | "skip";

export type ValidationSummary = {
  mode: "ranges" | "single_point";
  passed: boolean;
  warnings: string[];
  checks: {
    od: ValidationCheckStatus;
    massabsorption: ValidationCheckStatus;
    betaCrossCheck: ValidationCheckStatus;
  };
  bypass: {
    bypassed: boolean;
    reason: string | null;
  };
};

export type QualityScoreComponent = {
  pointSpacing: number | null;
  snr: number | null;
  normalizationTargetDistance: number | null;
};

export type ExperimentQualityScores = {
  perChannel: Record<UploadedChannel, QualityScoreComponent>;
  doiPresent: boolean;
  normalizationRangesPresent: boolean;
  aggregateScore: number | null;
};

function isPerChannelStoredRanges(
  ranges: NormalizationRanges,
): ranges is PerChannelNormalizationRanges {
  return (
    ranges !== null &&
    typeof ranges === "object" &&
    "od" in ranges &&
    "massabsorption" in ranges &&
    "beta" in ranges
  );
}

/**
 * Resolves contributor pre/post windows for one scalar channel: under `per_channel` scope returns that
 * channel's pair; under `unified` / `none` returns the shared unified object when `ranges` is unified-shaped.
 */
export function unifiedRangesForUploadedChannel(
  scope: NormalizationScope,
  ranges: NormalizationRanges,
  channel: Exclude<UploadedChannel, "rawabs">,
): UnifiedNormalizationRanges | null {
  if (!ranges) {
    return null;
  }
  if (scope === "per_channel" && isPerChannelStoredRanges(ranges)) {
    if (channel === "od") {
      return ranges.od;
    }
    if (channel === "massabsorption") {
      return ranges.massabsorption;
    }
    return ranges.beta;
  }
  return ranges as UnifiedNormalizationRanges;
}

/**
 * Assigns per-channel provenance for upload and derivation paths.
 */
export function buildChannelProvenance(args: {
  uploadedChannels: UploadedChannel[];
  hasDerivedValues: {
    od: boolean;
    massabsorption: boolean;
    beta: boolean;
  };
}): ChannelProvenance {
  const uploaded = new Set<UploadedChannel>(args.uploadedChannels);
  return {
    rawabs: "uploaded_authoritative",
    od: uploaded.has("od")
      ? "uploaded_authoritative"
      : args.hasDerivedValues.od
        ? "derived"
        : "missing",
    massabsorption: uploaded.has("massabsorption")
      ? "uploaded_authoritative"
      : args.hasDerivedValues.massabsorption
        ? "derived_with_assumptions"
        : "missing",
    beta: uploaded.has("beta")
      ? "uploaded_authoritative"
      : args.hasDerivedValues.beta
        ? "derived_with_assumptions"
        : "missing",
  };
}

function finiteValues(points: SpectrumPoint[], key: UploadedChannel): number[] {
  const values: number[] = [];
  for (const point of points) {
    const value =
      key === "rawabs"
        ? point.absorption
        : key === "od"
          ? point.od
          : key === "massabsorption"
            ? point.massabsorption
            : point.beta;
    if (typeof value === "number" && Number.isFinite(value)) {
      values.push(value);
    }
  }
  return values;
}

function hasFiniteErrors(points: SpectrumPoint[], key: UploadedChannel): boolean {
  for (const point of points) {
    const error =
      key === "rawabs"
        ? point.rawabsError
        : key === "od"
          ? point.odError
          : key === "massabsorption"
            ? point.massabsorptionError
            : point.betaError;
    if (typeof error === "number" && Number.isFinite(error) && error > 0) {
      return true;
    }
  }
  return false;
}

function finiteTargetPoints(
  points: SpectrumPoint[],
  key: UploadedChannel,
  target: number,
): number[] {
  const values = finiteValues(points, key);
  return values.map((value) => Math.abs(value - target));
}

function mean(values: number[]): number | null {
  if (values.length === 0) return null;
  const total = values.reduce((sum, value) => sum + value, 0);
  return total / values.length;
}

function standardDeviation(values: number[]): number | null {
  const m = mean(values);
  if (m == null) return null;
  const variance =
    values.reduce((sum, value) => sum + (value - m) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

function averageSpacing(points: SpectrumPoint[]): number | null {
  if (points.length < 2) return null;
  const ordered = [...points].sort((a, b) => a.energy - b.energy);
  const diffs: number[] = [];
  for (let i = 1; i < ordered.length; i += 1) {
    const diff = ordered[i]!.energy - ordered[i - 1]!.energy;
    if (Number.isFinite(diff) && diff > 0) diffs.push(diff);
  }
  return mean(diffs);
}

function averageSpacingForChannel(
  points: SpectrumPoint[],
  key: UploadedChannel,
): number | null {
  const filtered = points.filter((point) => {
    const value =
      key === "rawabs"
        ? point.absorption
        : key === "od"
          ? point.od
          : key === "massabsorption"
            ? point.massabsorption
            : point.beta;
    return typeof value === "number" && Number.isFinite(value);
  });
  return averageSpacing(filtered);
}

function normalizationMeanDeviationForChannel(
  points: SpectrumPoint[],
  ranges: NormalizationRanges,
  key: UploadedChannel,
  scope: NormalizationScope,
): number | null {
  if (!ranges) {
    return null;
  }
  const unified =
    key === "rawabs"
      ? unifiedRangesForUploadedChannel(scope, ranges, "od")
      : unifiedRangesForUploadedChannel(scope, ranges, key);
  if (!unified) {
    return null;
  }
  const prePts = pointsInRange(points, unified.pre);
  const postPts = pointsInRange(points, unified.post);
  const pooled = [
    ...finiteTargetPoints(prePts, key, 0),
    ...finiteTargetPoints(postPts, key, 1),
  ];
  return mean(pooled);
}

function snr(values: number[]): number | null {
  const m = mean(values);
  const sigma = standardDeviation(values);
  if (m == null || sigma == null || sigma <= 0) return null;
  return Math.abs(m) / sigma;
}

function pointsInRange(
  points: SpectrumPoint[],
  range: NormalizationRange,
): SpectrumPoint[] {
  if (!range) return [];
  const [start, end] = range;
  return points.filter((point) => point.energy >= start && point.energy <= end);
}

/**
 * Computes basic validation checks for range-based and single-point fallback mode.
 */
export function buildValidationSummary(args: {
  points: SpectrumPoint[];
  ranges: NormalizationRanges;
  scope?: NormalizationScope;
  override: { bypass: boolean; reason?: string };
}): ValidationSummary {
  const warnings: string[] = [];
  const scope: NormalizationScope = args.scope ?? "unified";
  const odWindows = unifiedRangesForUploadedChannel(scope, args.ranges, "od");
  const prePoints = pointsInRange(args.points, odWindows?.pre ?? null);
  const postPoints = pointsInRange(args.points, odWindows?.post ?? null);
  const mode =
    prePoints.length > 0 && postPoints.length > 0 ? "ranges" : "single_point";
  if (mode === "single_point") {
    warnings.push(
      "Normalization ranges were not available; validation used single-point checks.",
    );
  }

  const checkOd = (): ValidationCheckStatus => {
    const pre = mode === "ranges" ? prePoints : args.points.slice(0, 1);
    const post = mode === "ranges" ? postPoints : args.points.slice(-1);
    const preDistance = mean(finiteTargetPoints(pre, "od", 0));
    const postDistance = mean(finiteTargetPoints(post, "od", 1));
    if (preDistance == null || postDistance == null) return "skip";
    if (preDistance > 0.25 || postDistance > 0.25) {
      warnings.push(
        `OD normalization target distance exceeded threshold (pre=${preDistance.toFixed(3)}, post=${postDistance.toFixed(3)}).`,
      );
      return "warn";
    }
    return "pass";
  };

  const checkMassAbsorption = (): ValidationCheckStatus => {
    const values = finiteValues(args.points, "massabsorption");
    if (values.length === 0) return "skip";
    const nonPositiveCount = values.filter((value) => value <= 0).length;
    if (nonPositiveCount > 0) {
      warnings.push(
        "Mass absorption includes non-positive values and may indicate inconsistent normalization.",
      );
      return "warn";
    }
    return "pass";
  };

  const checkBetaCross = (): ValidationCheckStatus => {
    const pairs = args.points
      .map((point) => ({ beta: point.beta, mass: point.massabsorption }))
      .filter(
        (pair): pair is { beta: number; mass: number } =>
          typeof pair.beta === "number" &&
          Number.isFinite(pair.beta) &&
          typeof pair.mass === "number" &&
          Number.isFinite(pair.mass) &&
          pair.mass !== 0,
      );
    if (pairs.length === 0) return "skip";
    const relative = pairs.map((pair) =>
      Math.abs(pair.beta - pair.mass) / Math.abs(pair.mass),
    );
    const median = [...relative].sort((a, b) => a - b)[
      Math.floor(relative.length / 2)
    ];
    if (median == null) return "skip";
    if (median > 0.1) {
      warnings.push(
        `Beta and mass-absorption diverged beyond 10% median relative difference (${(median * 100).toFixed(1)}%).`,
      );
      return "warn";
    }
    return "pass";
  };

  const checks = {
    od: checkOd(),
    massabsorption: checkMassAbsorption(),
    betaCrossCheck: checkBetaCross(),
  };
  const hasWarnings = Object.values(checks).includes("warn");
  return {
    mode,
    passed: !hasWarnings || args.override.bypass,
    warnings,
    checks,
    bypass: {
      bypassed: args.override.bypass,
      reason: args.override.reason?.trim() ?? null,
    },
  };
}

/**
 * Computes quality metrics where lower point spacing is better and higher SNR is better.
 */
export function buildQualityScores(args: {
  points: SpectrumPoint[];
  ranges: NormalizationRanges;
  scope?: NormalizationScope;
  doiPresent: boolean;
}): ExperimentQualityScores {
  const scope: NormalizationScope = args.scope ?? "unified";
  const channelComponent = (key: UploadedChannel): QualityScoreComponent => {
    const values = finiteValues(args.points, key);
    const normDistance = normalizationMeanDeviationForChannel(
      args.points,
      args.ranges,
      key,
      scope,
    );
    return {
      pointSpacing: averageSpacingForChannel(args.points, key),
      snr: hasFiniteErrors(args.points, key) ? snr(values) : null,
      normalizationTargetDistance: normDistance,
    };
  };

  const perChannel = {
    rawabs: channelComponent("rawabs"),
    od: channelComponent("od"),
    massabsorption: channelComponent("massabsorption"),
    beta: channelComponent("beta"),
  };

  const spacingSamples = Object.values(perChannel)
    .map((entry) => entry.pointSpacing)
    .filter((value): value is number => value != null && Number.isFinite(value))
    .map((spacing) => 1 / (1 + spacing));
  const spacingNorm =
    spacingSamples.length === 0
      ? null
      : spacingSamples.reduce((sum, value) => sum + value, 0) /
        spacingSamples.length;
  const snrValues = Object.values(perChannel)
    .map((entry) => entry.snr)
    .filter((value): value is number => value != null && Number.isFinite(value));
  const snrNorm =
    snrValues.length === 0
      ? null
      : snrValues.reduce((sum, value) => sum + value / (1 + value), 0) /
        snrValues.length;
  const distanceSamples = Object.values(perChannel)
    .map((entry) => entry.normalizationTargetDistance)
    .filter((value): value is number => value != null && Number.isFinite(value))
    .map((distance) => 1 / (1 + distance));
  const distanceNorm =
    distanceSamples.length === 0
      ? null
      : distanceSamples.reduce((sum, value) => sum + value, 0) /
        distanceSamples.length;
  const normalizationRangesPresent = args.ranges != null;

  const aggregateParts = [spacingNorm, snrNorm, distanceNorm].filter(
    (value): value is number => value != null,
  );
  if (normalizationRangesPresent || !args.doiPresent) {
    aggregateParts.push(normalizationRangesPresent ? 1 : 0);
  }
  if (args.doiPresent) {
    aggregateParts.push(1);
  }

  return {
    perChannel,
    doiPresent: args.doiPresent,
    normalizationRangesPresent,
    aggregateScore:
      aggregateParts.length > 0
        ? aggregateParts.reduce((sum, value) => sum + value, 0) /
          aggregateParts.length
        : null,
  };
}
