/**
 * Content checksum of an optical model version.
 *
 * Owns the canonical JSON shape that is hashed when a version is published. Does not read the
 * database. The hash covers normalization, peaks in stored order, dataset links with pins, and the
 * tensor digest, and excludes title, description, authors, and timestamps.
 */

import type { OpticalModelPeak, Prisma } from "~/prisma/client";
import { canonicalJsonChecksum } from "~/server/nexafs/apply-versioned-change";

/** Inputs of {@link computeVersionChecksum}. */
export interface VersionChecksumContent {
  /** Stored normalization JSON, or `null` when the version has none. */
  normalization: Prisma.InputJsonValue | null;
  /** Peaks in stored order, as produced by {@link peakRowToJson}. */
  peaks: Prisma.InputJsonObject[];
  /** Dataset links; `pinned` is the formatted dataset version such as `1.0.2`. */
  datasets: { experimentId: string; pinned: string; role: string }[];
  /** SHA-256 hex digest of the tensor blob, or `null` when the version has no tensor. */
  tensorSha256: string | null;
}

/**
 * Peak row as a fixed-shape JSON object for hashing.
 *
 * @param row - Stored peak row.
 * @returns An object with every field present; missing values are `null`.
 */
export function peakRowToJson(row: OpticalModelPeak): Prisma.InputJsonObject {
  return {
    ordinal: row.ordinal,
    centerEv: row.centerEv,
    kind: row.kind,
    transition: row.transition,
    amplitude: row.amplitude,
    width: row.width,
    shape: row.shape,
    centerErr: row.centerErr,
    amplitudeErr: row.amplitudeErr,
    widthErr: row.widthErr,
    experimentId: row.experimentId,
    polarizationId: row.polarizationId,
    params: row.params as Prisma.InputJsonValue | null,
    fitProvenance: row.fitProvenance as Prisma.InputJsonValue | null,
  };
}

/**
 * Lowercase SHA-256 hex checksum of a version's content.
 *
 * Dataset links are sorted by `experimentId` so link order never changes the hash. Peak order is
 * preserved because ordinals are part of the content.
 *
 * @param content - The version content to hash.
 * @returns A 64-character lowercase hex digest.
 * @throws Error when any number in `content` is not finite.
 */
export function computeVersionChecksum(
  content: VersionChecksumContent,
): string {
  const datasets = [...content.datasets].sort((a, b) =>
    a.experimentId < b.experimentId
      ? -1
      : a.experimentId > b.experimentId
        ? 1
        : 0,
  );
  return canonicalJsonChecksum({
    normalization: content.normalization,
    peaks: content.peaks,
    datasets,
    tensorSha256: content.tensorSha256,
  });
}
