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

export type AuxFileVisualKind =
  | "document"
  | "spreadsheet"
  | "image"
  | "data"
  | "archive"
  | "generic";

/**
 * Maps MIME type and filename hints to a drop-zone icon category for stacked page visuals.
 */
export function inferAuxFileVisualKindFromMime(
  mimeType: string,
  fileName = "",
): AuxFileVisualKind {
  const mime = mimeType.trim().toLowerCase();
  const name = fileName.toLowerCase();

  if (
    mime.startsWith("image/") ||
    /\.(jpe?g|png|webp|tiff?|gif)$/i.test(name)
  ) {
    return "image";
  }
  if (
    mime.includes("spreadsheet") ||
    mime.includes("excel") ||
    mime === "text/csv" ||
    mime === "application/csv" ||
    name.endsWith(".xlsx") ||
    name.endsWith(".xls") ||
    name.endsWith(".csv")
  ) {
    return "spreadsheet";
  }
  if (
    mime === "application/pdf" ||
    mime.includes("word") ||
    name.endsWith(".pdf") ||
    name.endsWith(".docx") ||
    name.endsWith(".doc")
  ) {
    return "document";
  }
  if (
    mime.includes("hdf") ||
    mime.includes("netcdf") ||
    mime === "application/json" ||
    mime === "text/json" ||
    name.endsWith(".h5") ||
    name.endsWith(".hdf5") ||
    name.endsWith(".nc") ||
    name.endsWith(".json")
  ) {
    return "data";
  }
  if (
    mime === "application/zip" ||
    mime === "application/gzip" ||
    mime === "application/x-gzip" ||
    mime === "application/x-tar"
  ) {
    return "archive";
  }
  return "generic";
}

/**
 * Infers stacked drop-zone icon category from a browser `File` instance.
 */
export function inferAuxFileVisualKindFromFile(file: File): AuxFileVisualKind {
  return inferAuxFileVisualKindFromMime(file.type, file.name);
}

/**
 * Maps global drag overlay type labels (for example `PDF`, `image`) to icon categories.
 */
export function inferAuxFileVisualKindFromDropLabel(
  label: string,
): AuxFileVisualKind {
  const normalized = label.trim().toLowerCase();
  if (normalized === "json" || normalized === "data") {
    return "data";
  }
  if (normalized === "csv" || normalized === "spreadsheet") {
    return "spreadsheet";
  }
  if (normalized === "pdf" || normalized === "document") {
    return "document";
  }
  if (normalized === "image") {
    return "image";
  }
  return "generic";
}

/**
 * Builds a short type label for drag overlay copy from a file MIME type and name.
 */
export function dropTypeLabelFromFile(file: File): string {
  const mime = (file.type || "").trim().toLowerCase();
  const name = file.name.toLowerCase();

  if (
    mime === "application/json" ||
    mime === "text/json" ||
    name.endsWith(".json")
  ) {
    return "JSON";
  }
  if (
    mime === "text/csv" ||
    mime === "application/csv" ||
    name.endsWith(".csv")
  ) {
    return "CSV";
  }
  if (mime === "application/pdf" || name.endsWith(".pdf")) {
    return "PDF";
  }
  if (mime.startsWith("image/") || /\.(jpe?g|png|webp|tiff?|gif)$/i.test(name)) {
    return "image";
  }
  if (
    mime.includes("spreadsheet") ||
    mime.includes("excel") ||
    name.endsWith(".xlsx") ||
    name.endsWith(".xls")
  ) {
    return "spreadsheet";
  }
  if (
    mime.includes("word") ||
    name.endsWith(".docx") ||
    name.endsWith(".doc")
  ) {
    return "document";
  }
  if (
    mime.includes("hdf") ||
    mime.includes("netcdf") ||
    name.endsWith(".h5") ||
    name.endsWith(".hdf5") ||
    name.endsWith(".nc")
  ) {
    return "data";
  }
  const ext = name.includes(".") ? name.slice(name.lastIndexOf(".") + 1) : "";
  if (ext.length > 0) {
    return ext.toUpperCase();
  }
  return "files";
}

/**
 * Builds reader-facing drop copy: `Drop {type} here to upload {uploadTypeLabel}` without duplicating "file".
 */
export function formatDropOverlayMessage(
  fileTypeLabel: string,
  uploadTypeLabel: string,
): string {
  const trimmed = fileTypeLabel.trim();
  const target = uploadTypeLabel.trim();
  const subject =
    trimmed === "" || trimmed.toLowerCase() === "file"
      ? "files"
      : trimmed;
  if (!target) {
    return `Drop ${subject} here to upload`;
  }
  return `Drop ${subject} here to upload ${target}`;
}

const AUX_KIND_TO_VISUAL: Record<AuxFileKind, AuxFileVisualKind> = {
  protocol: "document",
  raw_data: "data",
  image: "image",
  spreadsheet: "spreadsheet",
  document: "document",
  other: "generic",
};

/**
 * Maps queued aux file kind metadata to stacked drop-zone icon categories.
 */
export function auxFileVisualKindFromAuxKind(
  kind: AuxFileKind,
): AuxFileVisualKind {
  return AUX_KIND_TO_VISUAL[kind];
}
