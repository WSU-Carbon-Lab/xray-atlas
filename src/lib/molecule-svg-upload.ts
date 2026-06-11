/**
 * SVG-only validation helpers for molecule structure uploads on the registry
 * contribute form and server image pipeline.
 */

export const MOLECULE_STRUCTURE_SVG_ACCEPT =
  "image/svg+xml,.svg" as const;

export const MOLECULE_STRUCTURE_SVG_MIME = "image/svg+xml" as const;

const RASTER_MIME_PREFIXES = [
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/gif",
  "image/webp",
] as const;

/**
 * Returns true when the file is an SVG by MIME type or `.svg` extension.
 *
 * @param file - Browser `File` from an upload control.
 */
export function isMoleculeStructureSvgFile(file: File): boolean {
  const mime = file.type.toLowerCase();
  if (mime === MOLECULE_STRUCTURE_SVG_MIME) {
    return true;
  }
  if (RASTER_MIME_PREFIXES.some((prefix) => mime.startsWith(prefix))) {
    return false;
  }
  return file.name.toLowerCase().endsWith(".svg");
}

/**
 * Validates SVG upload bytes for registry structure images.
 *
 * @param buffer - Raw file contents.
 * @param mimeType - Declared MIME type from the data URL or upload metadata.
 * @throws Error when the payload is not SVG or exceeds size limits.
 */
export function assertMoleculeStructureSvgUpload(
  buffer: Buffer,
  mimeType: string,
  maxBytes = 10 * 1024 * 1024,
): void {
  const normalizedMime = mimeType.toLowerCase();
  if (normalizedMime !== MOLECULE_STRUCTURE_SVG_MIME) {
    throw new Error(
      "Structure uploads must be SVG. PNG, JPEG, GIF, and WebP are not accepted.",
    );
  }
  if (buffer.length > maxBytes) {
    throw new Error(
      `SVG size exceeds maximum allowed size of ${maxBytes / 1024 / 1024}MB`,
    );
  }
  const head = buffer.subarray(0, Math.min(buffer.length, 4096)).toString("utf8").trim();
  if (!head.includes("<svg") && !head.includes("<?xml")) {
    throw new Error("Uploaded file is not valid SVG markup.");
  }
}

/**
 * Builds a data URL for an SVG string suitable for `molecules.uploadImage`.
 *
 * @param svgMarkup - Full SVG document from the sketcher snapshot pipeline.
 */
export function moleculeSvgMarkupToDataUrl(svgMarkup: string): string {
  const encoded = btoa(unescape(encodeURIComponent(svgMarkup)));
  return `data:${MOLECULE_STRUCTURE_SVG_MIME};base64,${encoded}`;
}
