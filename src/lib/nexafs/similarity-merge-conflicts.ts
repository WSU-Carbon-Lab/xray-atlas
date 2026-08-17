/**
 * Builds Keep vs Absorb field conflicts for contribute similarity confirm and
 * persist-merge. Internal `existing` is Keep; `upload` is Absorb. Bulk Prefer
 * keep / Prefer absorb / Smart merge resolve rows; unresolved conflicts block
 * continue.
 */

import type { ProcessMethod } from "~/prisma/browser";
import type { ExperimentTypeOption } from "~/features/process-nexafs/types";
import type { SimilarityContinuePatch } from "~/features/process-nexafs/utils/similarity-continue-patch";
import {
  dedupeDatasetAttributions,
  type DatasetAttributionEntry,
} from "~/lib/nexafs-attribution";
import { PROCESS_METHOD_OPTIONS } from "~/features/process-nexafs/constants";

/** Category for grouped confirmation cards. */
export type SimilarityMergeCategory = "experiment" | "sample" | "attribution";

/** How a conflict row is resolved (`existing` = Keep, `upload` = Absorb). */
export type SimilarityMergeResolution = "upload" | "existing" | "both";

/** Lifecycle of one mergeable field. */
export type SimilarityMergeStatus = "agreed" | "conflict" | "resolved";

/** Stable ids for resolvable fields. */
export type SimilarityMergeFieldId =
  | "edge"
  | "instrument"
  | "type"
  | "researchers"
  | "substrate"
  | "processMethod"
  | "thickness"
  | "solvent"
  | "patterningLayer";

/** One Keep vs Absorb field for the confirmation panel. */
export interface SimilarityMergeConflictRow {
  /** Stable field id used as resolution map key. */
  id: SimilarityMergeFieldId;
  /** UI card group. */
  category: SimilarityMergeCategory;
  /** Short label. */
  label: string;
  /** Display string for the upload side. */
  uploadDisplay: string;
  /** Display string for the existing side. */
  existingDisplay: string;
  /** Whether values match, still disagree, or have been resolved. */
  status: SimilarityMergeStatus;
  /** Chosen side when status is resolved; `both` only for researchers. */
  resolution?: SimilarityMergeResolution;
  /** True when `both` is a valid resolution (researchers only). */
  allowsBoth: boolean;
}

/** Inputs required to compare upload draft fields to an Atlas experiment. */
export interface SimilarityMergeCompareSides {
  edge: {
    upload: string;
    existing: string;
    uploadId: string;
    existingId: string;
  };
  instrument: {
    upload: string;
    existing: string;
    uploadId: string;
    existingId: string;
  };
  type: {
    upload: string;
    existing: string;
    uploadValue: ExperimentTypeOption | "";
    existingValue: ExperimentTypeOption | "";
  };
  researchers: {
    upload: DatasetAttributionEntry[];
    existing: DatasetAttributionEntry[];
    uploadDisplay: string;
    existingDisplay: string;
  };
  substrate: { upload: string; existing: string };
  processMethod: {
    upload: ProcessMethod | null;
    existing: ProcessMethod | null;
    uploadDisplay: string;
    existingDisplay: string;
  };
  thickness: {
    upload: number | null;
    existing: number | null;
    uploadDisplay: string;
    existingDisplay: string;
  };
  solvent: { upload: string; existing: string };
  patterningLayer: { upload: string; existing: string };
}

/**
 * Normalizes compare text for equality (trim, collapse whitespace, lower case).
 *
 * @param value - Raw display or id string.
 * @returns Normalized form; empty string when blank.
 */
export function normalizeMergeCompareText(value: string): string {
  return value.replace(/\s+/g, " ").trim().toLowerCase();
}

/**
 * Formats a process method enum for confirmation display.
 *
 * @param value - Prisma process method or null.
 * @returns Human label or em dash.
 */
export function formatProcessMethodDisplay(
  value: ProcessMethod | null | undefined,
): string {
  if (!value) {
    return "—";
  }
  const match = PROCESS_METHOD_OPTIONS.find((row) => row.value === value);
  return match?.label ?? value;
}

/**
 * Formats optional finite thickness for confirmation display.
 *
 * @param value - Thickness in nm, or null.
 * @returns Display string or em dash.
 */
export function formatThicknessDisplay(
  value: number | null | undefined,
): string {
  if (value == null || !Number.isFinite(value)) {
    return "—";
  }
  return `${value}`;
}

function displayOrDash(value: string): string {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : "—";
}

function valuesAgree(upload: string, existing: string): boolean {
  const a = normalizeMergeCompareText(upload === "—" ? "" : upload);
  const b = normalizeMergeCompareText(existing === "—" ? "" : existing);
  return a === b;
}

function buildRow(
  id: SimilarityMergeFieldId,
  category: SimilarityMergeCategory,
  label: string,
  uploadDisplay: string,
  existingDisplay: string,
  allowsBoth = false,
): SimilarityMergeConflictRow {
  const agreed = valuesAgree(uploadDisplay, existingDisplay);
  return {
    id,
    category,
    label,
    uploadDisplay: displayOrDash(uploadDisplay === "—" ? "" : uploadDisplay),
    existingDisplay: displayOrDash(
      existingDisplay === "—" ? "" : existingDisplay,
    ),
    status: agreed ? "agreed" : "conflict",
    allowsBoth,
  };
}

/**
 * Builds the initial merge conflict table from upload and existing field sides.
 *
 * @param sides - Display strings and underlying values for each mergeable field.
 * @returns Rows with `agreed` or `conflict` status (no resolutions yet).
 */
export function buildSimilarityMergeConflicts(
  sides: SimilarityMergeCompareSides,
): SimilarityMergeConflictRow[] {
  return [
    buildRow(
      "edge",
      "experiment",
      "Edge",
      sides.edge.upload,
      sides.edge.existing,
    ),
    buildRow(
      "instrument",
      "experiment",
      "Instrument",
      sides.instrument.upload,
      sides.instrument.existing,
    ),
    buildRow(
      "type",
      "experiment",
      "Type",
      sides.type.upload,
      sides.type.existing,
    ),
    buildRow(
      "substrate",
      "sample",
      "Substrate",
      sides.substrate.upload,
      sides.substrate.existing,
    ),
    buildRow(
      "processMethod",
      "sample",
      "Process method",
      sides.processMethod.uploadDisplay,
      sides.processMethod.existingDisplay,
    ),
    buildRow(
      "thickness",
      "sample",
      "Thickness (nm)",
      sides.thickness.uploadDisplay,
      sides.thickness.existingDisplay,
    ),
    buildRow(
      "solvent",
      "sample",
      "Solvent",
      sides.solvent.upload,
      sides.solvent.existing,
    ),
    buildRow(
      "patterningLayer",
      "sample",
      "Patterning layer",
      sides.patterningLayer.upload,
      sides.patterningLayer.existing,
    ),
    buildRow(
      "researchers",
      "attribution",
      "Researchers",
      sides.researchers.uploadDisplay,
      sides.researchers.existingDisplay,
      true,
    ),
  ];
}

/**
 * Resolves every non-agreed row to the given side (`both` only applied where allowed).
 *
 * @param rows - Current conflict rows.
 * @param resolution - Bulk resolution target.
 * @returns New rows with conflicts marked resolved.
 */
export function applyBulkMergeResolution(
  rows: readonly SimilarityMergeConflictRow[],
  resolution: SimilarityMergeResolution,
): SimilarityMergeConflictRow[] {
  return rows.map((row) => {
    if (row.status === "agreed") {
      return row;
    }
    const nextResolution =
      resolution === "both" && !row.allowsBoth ? "upload" : resolution;
    if (nextResolution === "both" && !row.allowsBoth) {
      return {
        ...row,
        status: "resolved",
        resolution: "upload",
      };
    }
    return {
      ...row,
      status: "resolved",
      resolution: nextResolution,
    };
  });
}

/**
 * Smart-merge: empty yields to non-empty; equals stay upload; researchers become
 * both; true disagreements remain `conflict`.
 *
 * @param rows - Current conflict rows.
 * @returns Rows after automatic soft resolutions.
 */
export function applySmartMergeResolution(
  rows: readonly SimilarityMergeConflictRow[],
): SimilarityMergeConflictRow[] {
  return rows.map((row) => {
    if (row.status === "agreed") {
      return row;
    }
    if (row.id === "researchers") {
      return {
        ...row,
        status: "resolved",
        resolution: "both",
      };
    }
    const uploadEmpty =
      normalizeMergeCompareText(
        row.uploadDisplay === "—" ? "" : row.uploadDisplay,
      ).length === 0;
    const existingEmpty =
      normalizeMergeCompareText(
        row.existingDisplay === "—" ? "" : row.existingDisplay,
      ).length === 0;
    if (uploadEmpty && !existingEmpty) {
      return { ...row, status: "resolved", resolution: "existing" };
    }
    if (!uploadEmpty && existingEmpty) {
      return { ...row, status: "resolved", resolution: "upload" };
    }
    if (uploadEmpty && existingEmpty) {
      return { ...row, status: "resolved", resolution: "upload" };
    }
    return { ...row, status: "conflict", resolution: undefined };
  });
}

/**
 * Sets resolution on one conflict row.
 *
 * @param rows - Current rows.
 * @param id - Field id.
 * @param resolution - Chosen side.
 * @returns Updated rows.
 */
export function resolveSimilarityMergeConflict(
  rows: readonly SimilarityMergeConflictRow[],
  id: SimilarityMergeFieldId,
  resolution: SimilarityMergeResolution,
): SimilarityMergeConflictRow[] {
  return rows.map((row) => {
    if (row.id !== id) {
      return row;
    }
    if (row.status === "agreed") {
      return row;
    }
    if (resolution === "both" && !row.allowsBoth) {
      return row;
    }
    return {
      ...row,
      status: "resolved",
      resolution,
    };
  });
}

/**
 * Counts rows that still need a resolution choice.
 *
 * @param rows - Conflict table.
 * @returns Number of `conflict` rows.
 */
export function countUnresolvedMergeConflicts(
  rows: readonly SimilarityMergeConflictRow[],
): number {
  return rows.filter((row) => row.status === "conflict").length;
}

/**
 * Builds the submit patch from resolved (and agreed) merge rows plus side payloads.
 *
 * @param rows - Conflict table after user resolutions.
 * @param sides - Underlying ids and attribution arrays.
 * @returns Patch for {@link applySimilarityContinuePatch}; empty when everything stays upload.
 */
export function buildSimilarityContinuePatchFromMerges(
  rows: readonly SimilarityMergeConflictRow[],
  sides: SimilarityMergeCompareSides,
): SimilarityContinuePatch {
  const byId = new Map(rows.map((row) => [row.id, row]));
  const patch: SimilarityContinuePatch = {};

  const edge = byId.get("edge");
  if (
    edge?.status === "resolved" &&
    edge.resolution === "existing" &&
    sides.edge.existingId
  ) {
    patch.edgeId = sides.edge.existingId;
  }

  const instrument = byId.get("instrument");
  if (
    instrument?.status === "resolved" &&
    instrument.resolution === "existing" &&
    sides.instrument.existingId
  ) {
    patch.instrumentId = sides.instrument.existingId;
  }

  const type = byId.get("type");
  if (
    type?.status === "resolved" &&
    type.resolution === "existing" &&
    sides.type.existingValue
  ) {
    patch.experimentType = sides.type.existingValue;
  }

  const substrate = byId.get("substrate");
  if (substrate?.status === "resolved" && substrate.resolution === "existing") {
    patch.substrate = sides.substrate.existing;
  }

  const processMethod = byId.get("processMethod");
  if (
    processMethod?.status === "resolved" &&
    processMethod.resolution === "existing"
  ) {
    patch.processMethod = sides.processMethod.existing;
  }

  const thickness = byId.get("thickness");
  if (thickness?.status === "resolved" && thickness.resolution === "existing") {
    patch.thickness = sides.thickness.existing;
  }

  const solvent = byId.get("solvent");
  if (solvent?.status === "resolved" && solvent.resolution === "existing") {
    patch.solvent = sides.solvent.existing;
  }

  const patterning = byId.get("patterningLayer");
  if (
    patterning?.status === "resolved" &&
    patterning.resolution === "existing"
  ) {
    patch.patterningLayer = sides.patterningLayer.existing;
  }

  const researchers = byId.get("researchers");
  if (researchers?.status === "resolved") {
    if (researchers.resolution === "existing") {
      patch.attributions = dedupeDatasetAttributions([
        ...sides.researchers.existing,
      ]);
    } else if (researchers.resolution === "both") {
      patch.attributions = dedupeDatasetAttributions([
        ...sides.researchers.upload,
        ...sides.researchers.existing,
      ]);
    }
  }

  return patch;
}
