/**
 * Pre-upload quality checklist for the contribute similarity confirmation panel.
 * Reuses upload diagnostics / metrics models and adds normalization-band continuity.
 */

import type { SpectrumPoint } from "~/components/plots/types";
import type { DatasetState } from "~/features/process-nexafs/types";
import {
  computeUploadDatasetDiagnostics,
  type UploadDatasetDiagnostics,
} from "~/features/process-nexafs/utils/upload-dataset-diagnostics";
import { buildUploadDatasetMetricsCardModel } from "~/lib/nexafs-dataset-metric-display-model";
import type { NexafsBrowseDatasetMetricsCardModel } from "~/lib/nexafs-dataset-metric-display-model";
import {
  isUploaderContributorRole,
  type DatasetAttributionEntry,
} from "~/lib/nexafs-attribution";
import {
  evaluateEdgeEnergyConsistency,
  spectrumEnergyExtent,
} from "~/lib/nexafs/edge-energy-bands";
import { countUnresolvedMergeConflicts } from "~/lib/nexafs/similarity-merge-conflicts";
import type { SimilarityMergeConflictRow } from "~/lib/nexafs/similarity-merge-conflicts";

/** Severity for confirmation checklist rows. */
export type SimilarityConfirmCheckSeverity = "info" | "warn" | "blocker";

/** Stable checklist ids that may require acknowledgement. */
export type SimilarityConfirmCheckId =
  | "merge_conflicts"
  | "attribution_curator"
  | "edge_energy"
  | "validation_warnings"
  | "norm_band_continuity"
  | "metrics_preview";

/** One quality / confirmation checklist item. */
export interface SimilarityConfirmQualityCheck {
  /** Stable id for ack state. */
  id: SimilarityConfirmCheckId;
  /** Short title. */
  title: string;
  /** Detail message. */
  detail: string;
  /** How strongly this gates submit. */
  severity: SimilarityConfirmCheckSeverity;
  /** When true, Submit requires an explicit reviewed toggle. */
  requiresAck: boolean;
}

/** Bundle returned for the Quality card. */
export interface SimilarityConfirmQualityBundle {
  /** Checklist rows (merge + attribution + edge + norm + validation). */
  checks: SimilarityConfirmQualityCheck[];
  /** Upload metrics rail model (may be missing). */
  metrics: NexafsBrowseDatasetMetricsCardModel | null;
  /** Raw diagnostics when spectrum exists. */
  diagnostics: UploadDatasetDiagnostics | null;
}

/** Result of pre/post band continuity analysis. */
export interface NormBandContinuityResult {
  /** Whether a continuity problem was detected. */
  flagged: boolean;
  /** Human-readable summary. */
  message: string;
  /** Pre-edge ratio of edge-slope to interior slope (null when unscored). */
  preSlopeRatio: number | null;
  /** Post-edge ratio of edge-slope to interior slope (null when unscored). */
  postSlopeRatio: number | null;
}

const BAND_SLOPE_RATIO_WARN = 4;
const MIN_BAND_POINTS = 4;

function medianAbsolute(values: readonly number[]): number | null {
  const finite = values.filter((value) => Number.isFinite(value));
  if (finite.length === 0) {
    return null;
  }
  const sorted = [...finite].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1]! + sorted[mid]!) / 2;
  }
  return sorted[mid]!;
}

function firstDiffMagnitudes(
  points: readonly { energy: number; y: number }[],
): number[] {
  const diffs: number[] = [];
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1]!;
    const next = points[i]!;
    const dE = next.energy - prev.energy;
    if (!(dE > 0) || !Number.isFinite(next.y) || !Number.isFinite(prev.y)) {
      continue;
    }
    diffs.push(Math.abs((next.y - prev.y) / dE));
  }
  return diffs;
}

function pickAbsorption(point: SpectrumPoint): number | null {
  const candidates = [
    point.od,
    point.massabsorption,
    point.absorption,
    point.rawabs,
  ];
  for (const value of candidates) {
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
  }
  return null;
}

function pointsInWindow(
  points: readonly SpectrumPoint[],
  window: [number, number] | null,
): { energy: number; y: number }[] {
  if (!window) {
    return [];
  }
  const [lo, hi] = window[0] <= window[1] ? window : [window[1], window[0]];
  const out: { energy: number; y: number }[] = [];
  for (const point of points) {
    if (!(point.energy >= lo && point.energy <= hi)) {
      continue;
    }
    const y = pickAbsorption(point);
    if (y == null) {
      continue;
    }
    out.push({ energy: point.energy, y });
  }
  return [...out].sort((a, b) => a.energy - b.energy);
}

function bandSlopeRatio(
  bandPoints: readonly { energy: number; y: number }[],
): number | null {
  if (bandPoints.length < MIN_BAND_POINTS) {
    return null;
  }
  const edgeCount = Math.max(1, Math.floor(bandPoints.length * 0.2));
  const leftEdge = bandPoints.slice(0, edgeCount + 1);
  const rightEdge = bandPoints.slice(-(edgeCount + 1));
  const interior = bandPoints.slice(edgeCount, -edgeCount);
  if (interior.length < 2) {
    return null;
  }
  const edgeDiffs = [
    ...firstDiffMagnitudes(leftEdge),
    ...firstDiffMagnitudes(rightEdge),
  ];
  const interiorDiffs = firstDiffMagnitudes(interior);
  const edgeMed = medianAbsolute(edgeDiffs);
  const interiorMed = medianAbsolute(interiorDiffs);
  if (edgeMed == null || interiorMed == null) {
    return null;
  }
  const floor = Math.max(interiorMed, 1e-9);
  return edgeMed / floor;
}

/**
 * Flags pre/post normalization windows whose edge slopes dwarf the band interior
 * (discontinuous / non-flat plateaus relative to the selected region).
 *
 * @param points - Derived or raw spectrum points.
 * @param pre - Inclusive pre-edge energy window, or null when absent.
 * @param post - Inclusive post-edge energy window, or null when absent.
 * @returns Continuity result with optional slope ratios.
 */
export function assessNormBandContinuity(
  points: readonly SpectrumPoint[],
  pre: [number, number] | null,
  post: [number, number] | null,
): NormBandContinuityResult {
  if (!pre && !post) {
    return {
      flagged: false,
      message: "No normalization windows set on this upload.",
      preSlopeRatio: null,
      postSlopeRatio: null,
    };
  }

  const prePoints = pointsInWindow(points, pre);
  const postPoints = pointsInWindow(points, post);
  const preRatio = bandSlopeRatio(prePoints);
  const postRatio = bandSlopeRatio(postPoints);

  const badPre = preRatio != null && preRatio >= BAND_SLOPE_RATIO_WARN;
  const badPost = postRatio != null && postRatio >= BAND_SLOPE_RATIO_WARN;

  if (!badPre && !badPost) {
    return {
      flagged: false,
      message: "Pre/post normalization windows look continuous.",
      preSlopeRatio: preRatio,
      postSlopeRatio: postRatio,
    };
  }

  const parts: string[] = [];
  if (badPre) {
    parts.push(
      `pre-edge edge slope is ${preRatio!.toFixed(1)}x the band interior`,
    );
  }
  if (badPost) {
    parts.push(
      `post-edge edge slope is ${postRatio!.toFixed(1)}x the band interior`,
    );
  }
  return {
    flagged: true,
    message: `Normalization windows may be poorly placed (${parts.join("; ")}).`,
    preSlopeRatio: preRatio,
    postSlopeRatio: postRatio,
  };
}

/**
 * Builds the confirmation quality checklist for an upload draft.
 *
 * @param args.dataset - Upload dataset under review.
 * @param args.mergeRows - Current merge conflict table.
 * @param args.attributionsForSubmit - Attributions after the current researcher resolution (upload default when unresolved).
 * @param args.edgeLabel - Resolved edge label for energy-band check.
 * @returns Checklist, metrics model, and diagnostics.
 */
export function buildSimilarityConfirmQualityBundle(args: {
  dataset: DatasetState;
  mergeRows: readonly SimilarityMergeConflictRow[];
  attributionsForSubmit: readonly DatasetAttributionEntry[];
  edgeLabel: string;
}): SimilarityConfirmQualityBundle {
  const diagnostics = computeUploadDatasetDiagnostics(args.dataset);
  const metrics = diagnostics
    ? buildUploadDatasetMetricsCardModel(
        diagnostics.qualityScores,
        diagnostics.derivedPoints,
      )
    : null;

  const checks: SimilarityConfirmQualityCheck[] = [];

  const unresolved = countUnresolvedMergeConflicts(args.mergeRows);
  if (unresolved > 0) {
    checks.push({
      id: "merge_conflicts",
      title: "Unresolved merge conflicts",
      detail: `${unresolved} field${unresolved === 1 ? "" : "s"} still need Upload or Existing.`,
      severity: "blocker",
      requiresAck: false,
    });
  } else {
    checks.push({
      id: "merge_conflicts",
      title: "Merge conflicts",
      detail: "All disagreements are resolved.",
      severity: "info",
      requiresAck: false,
    });
  }

  const attributions = args.attributionsForSubmit;
  const curatorCount = attributions.filter((row) =>
    isUploaderContributorRole(row.role),
  ).length;
  if (attributions.length === 0) {
    checks.push({
      id: "attribution_curator",
      title: "Researchers",
      detail: "Add at least one researcher before submit.",
      severity: "blocker",
      requiresAck: false,
    });
  } else if (curatorCount !== 1) {
    checks.push({
      id: "attribution_curator",
      title: "Data curator",
      detail: `Expected exactly one data curator (uploader); found ${curatorCount}.`,
      severity: "blocker",
      requiresAck: false,
    });
  } else {
    checks.push({
      id: "attribution_curator",
      title: "Researchers",
      detail: `${attributions.length} researcher${attributions.length === 1 ? "" : "s"} with one data curator.`,
      severity: "info",
      requiresAck: false,
    });
  }

  const extent = spectrumEnergyExtent(args.dataset.spectrumPoints);
  if (extent && args.edgeLabel.trim().length > 0) {
    const edgeCheck = evaluateEdgeEnergyConsistency({
      edgeLabel: args.edgeLabel,
      minEv: extent.minEv,
      maxEv: extent.maxEv,
    });
    if (!edgeCheck.ok) {
      checks.push({
        id: "edge_energy",
        title: "Edge vs energy span",
        detail: edgeCheck.message,
        severity: "blocker",
        requiresAck: true,
      });
    } else {
      checks.push({
        id: "edge_energy",
        title: "Edge vs energy span",
        detail: edgeCheck.expectedBand
          ? `Spectrum sits in the typical ${edgeCheck.expectedBand.label} window.`
          : "No typical band for this edge (exotic edges skip hard validation).",
        severity: "info",
        requiresAck: false,
      });
    }
  }

  const continuity = assessNormBandContinuity(
    diagnostics?.derivedPoints ?? args.dataset.spectrumPoints,
    args.dataset.normalizationRegions.pre,
    args.dataset.normalizationRegions.post,
  );
  if (continuity.flagged) {
    checks.push({
      id: "norm_band_continuity",
      title: "Normalization windows",
      detail: continuity.message,
      severity: "blocker",
      requiresAck: true,
    });
  } else {
    checks.push({
      id: "norm_band_continuity",
      title: "Normalization windows",
      detail: continuity.message,
      severity: "info",
      requiresAck: false,
    });
  }

  const warnings = diagnostics?.validationSummary.warnings ?? [];
  if (warnings.length > 0) {
    checks.push({
      id: "validation_warnings",
      title: "Validation warnings",
      detail: warnings.join(" "),
      severity: "warn",
      requiresAck: true,
    });
  }

  if (metrics && !metrics.missing) {
    checks.push({
      id: "metrics_preview",
      title: "Dataset quality metrics",
      detail: metrics.aggregatePercent != null
        ? `Headline quality score ${Math.round(metrics.aggregatePercent)}%. Review the metrics rail before submit.`
        : "Review spacing and SNR metrics before submit.",
      severity: "info",
      requiresAck: false,
    });
  }

  return { checks, metrics, diagnostics };
}

/**
 * True when every check that requires acknowledgement has been marked reviewed
 * and no hard blockers without ack remain unresolved via other gates.
 *
 * @param checks - Quality checklist.
 * @param acknowledgedIds - Set of check ids the user marked reviewed.
 * @returns Whether Submit may proceed from the quality side.
 */
export function similarityConfirmQualityAllowsSubmit(
  checks: readonly SimilarityConfirmQualityCheck[],
  acknowledgedIds: ReadonlySet<string>,
): boolean {
  for (const check of checks) {
    if (check.severity === "blocker" && !check.requiresAck) {
      return false;
    }
    if (check.requiresAck && !acknowledgedIds.has(check.id)) {
      return false;
    }
  }
  return true;
}
