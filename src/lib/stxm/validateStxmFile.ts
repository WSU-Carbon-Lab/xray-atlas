import { EXPERIMENT_AUX_MAX_BYTES } from "~/lib/aux-file-client";
import type { StxmHdrMetadata } from "./types";

/** Lowercase extensions allowed into the browser STXM parse pipeline. */
export const STXM_ALLOWED_EXTENSIONS = [".hdr", ".xim"] as const;

export type StxmAllowedExtension = (typeof STXM_ALLOWED_EXTENSIONS)[number];

export type StxmFileKind = "hdr" | "xim";

/** Maximum `.hdr` text size accepted for parsing (2 MiB). */
export const STXM_MAX_HDR_BYTES = 2 * 1024 * 1024;

/** Maximum `.xim` payload size aligned with experiment-aux uploads (500 MiB). */
export const STXM_MAX_XIM_BYTES = EXPERIMENT_AUX_MAX_BYTES;

/** Rejects headers claiming more axis samples than this count. */
export const STXM_MAX_AXIS_POINTS = 65_536;

/** Rejects `.xim` payloads whose decoded float count exceeds this bound. */
export const STXM_MAX_XIM_VALUES = STXM_MAX_AXIS_POINTS * STXM_MAX_AXIS_POINTS;

/**
 * Error thrown when a local STXM file fails allowlist or bounds checks before parse.
 */
export class StxmValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StxmValidationError";
  }
}

/**
 * Returns the STXM file kind for `filename` when the extension is allowlisted, else null.
 */
export function stxmFileKindFromName(filename: string): StxmFileKind | null {
  const lowered = filename.trim().toLowerCase();
  if (lowered.endsWith(".hdr")) {
    return "hdr";
  }
  if (lowered.endsWith(".xim")) {
    return "xim";
  }
  return null;
}

/**
 * Returns true when `filename` ends with an allowed STXM extension (case-insensitive).
 */
export function isAllowedStxmFilename(filename: string): boolean {
  return stxmFileKindFromName(filename) !== null;
}

/**
 * Validates byte length for an allowlisted STXM file before read/parse.
 *
 * @param sizeBytes - File size from `File.size`.
 * @param kind - Parsed kind from {@link stxmFileKindFromName}.
 * @throws {StxmValidationError} When size is non-positive or above the kind cap.
 */
export function validateStxmFileSize(sizeBytes: number, kind: StxmFileKind): void {
  if (!Number.isFinite(sizeBytes) || sizeBytes <= 0) {
    throw new StxmValidationError(`${kind} file is empty or has invalid size`);
  }
  const maxBytes = kind === "hdr" ? STXM_MAX_HDR_BYTES : STXM_MAX_XIM_BYTES;
  if (sizeBytes > maxBytes) {
    throw new StxmValidationError(
      `${kind} file exceeds ${Math.round(maxBytes / (1024 * 1024))} MiB limit`,
    );
  }
}

/**
 * Validates parsed header axis counts before allocating image buffers.
 *
 * @param header - Metadata from {@link readHdr}.
 * @throws {StxmValidationError} When counts are non-positive or exceed {@link STXM_MAX_AXIS_POINTS}.
 */
export function validateStxmHdrMetadata(header: StxmHdrMetadata): void {
  for (const [label, count] of [
    ["PAxis", header.paxisCount],
    ["QAxis", header.qaxisCount],
  ] as const) {
    if (!Number.isFinite(count) || count <= 0) {
      throw new StxmValidationError(`${label} point count is invalid`);
    }
    if (count > STXM_MAX_AXIS_POINTS) {
      throw new StxmValidationError(
        `${label} point count ${count} exceeds ${STXM_MAX_AXIS_POINTS}`,
      );
    }
  }
  const product = header.paxisCount * header.qaxisCount;
  if (product > STXM_MAX_XIM_VALUES) {
    throw new StxmValidationError(
      `Image size ${product} exceeds ${STXM_MAX_XIM_VALUES} samples`,
    );
  }
}

/**
 * Validates that decoded `.xim` value count matches header dimensions.
 *
 * @param valueCount - Number of floats decoded from `.xim`.
 * @param nRows - Q axis count from header.
 * @param nCols - P axis count from header.
 * @throws {StxmValidationError} When counts disagree or exceed bounds.
 */
export function validateStxmXimValueCount(
  valueCount: number,
  nRows: number,
  nCols: number,
): void {
  validateStxmHdrMetadata({
    paxisCount: nCols,
    qaxisCount: nRows,
    raw: "",
  });
  if (valueCount !== nRows * nCols) {
    throw new StxmValidationError(
      `xim value count ${valueCount} does not match (${nRows}, ${nCols})`,
    );
  }
}

/**
 * Validates paired `.hdr` and `.xim` files before entering the STXM loader.
 *
 * @param hdrFile - Header side of the pair.
 * @param ximFile - Image side of the pair.
 * @throws {StxmValidationError} When names, sizes, or extensions are invalid.
 */
export function validateStxmFilePair(hdrFile: File, ximFile: File): void {
  if (stxmFileKindFromName(hdrFile.name) !== "hdr") {
    throw new StxmValidationError("Expected .hdr file in STXM pair");
  }
  if (stxmFileKindFromName(ximFile.name) !== "xim") {
    throw new StxmValidationError("Expected .xim file in STXM pair");
  }
  validateStxmFileSize(hdrFile.size, "hdr");
  validateStxmFileSize(ximFile.size, "xim");
}
