export const SAMPLE_AUX_MAX_BYTES = 50 * 1024 * 1024;
export const EXPERIMENT_AUX_MAX_BYTES = 500 * 1024 * 1024;

export const AUX_FILE_KINDS = [
  "protocol",
  "raw_data",
  "image",
  "spreadsheet",
  "document",
  "other",
] as const;

export type AuxFileKind = (typeof AUX_FILE_KINDS)[number];

export const AUX_FILE_KIND_LABELS: Record<AuxFileKind, string> = {
  protocol: "Protocol",
  raw_data: "Raw data",
  image: "Image",
  spreadsheet: "Spreadsheet",
  document: "Document",
  other: "Other",
};

const AUX_MIME_WHITELIST = new Set([
  "application/pdf",
  "text/plain",
  "text/csv",
  "application/csv",
  "text/tab-separated-values",
  "application/json",
  "application/zip",
  "application/gzip",
  "application/x-gzip",
  "application/x-tar",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/tiff",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
  "application/x-hdf5",
  "application/x-hdf",
  "application/netcdf",
  "chemical/x-cif",
  "chemical/x-pdb",
]);

export type AuxFileScope = "sample" | "experiment";

export type AuxFileValidationResult =
  | { ok: true; mimeType: string }
  | { ok: false; message: string };

/**
 * Validates an auxiliary file against scope size caps and the shared MIME whitelist.
 */
export function validateAuxFileForScope(
  file: File,
  scope: AuxFileScope,
): AuxFileValidationResult {
  const maxBytes =
    scope === "sample" ? SAMPLE_AUX_MAX_BYTES : EXPERIMENT_AUX_MAX_BYTES;
  if (!Number.isFinite(file.size) || file.size <= 0) {
    return { ok: false, message: "File is empty." };
  }
  if (file.size > maxBytes) {
    const capMb = maxBytes / (1024 * 1024);
    return {
      ok: false,
      message: `File exceeds the ${capMb} MB limit for ${scope === "sample" ? "sample" : "experiment"} files.`,
    };
  }

  const mimeType = (file.type || "").trim().toLowerCase();
  if (mimeType === "image/svg+xml") {
    return { ok: false, message: "SVG uploads are not allowed." };
  }
  if (!mimeType || !AUX_MIME_WHITELIST.has(mimeType)) {
    return {
      ok: false,
      message: mimeType
        ? `File type not allowed: ${mimeType}`
        : "File type could not be determined. Use a supported format (PDF, CSV, images, HDF5, etc.).",
    };
  }

  return { ok: true, mimeType };
}

/**
 * Computes a lowercase hex SHA-256 digest for an auxiliary upload commit step.
 */
export async function sha256HexFromFile(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(hashBuffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export function formatAuxFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
