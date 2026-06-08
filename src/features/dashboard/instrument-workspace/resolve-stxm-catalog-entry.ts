import type { StxmCatalogEntry } from "~/lib/stxm";
import type { DashboardPreviewSpectrumEntry } from "~/lib/dashboard-processing-session";

/**
 * Resolves a preview or session scan key to a beamtime catalog row.
 *
 * Tries exact `relativePath` match first, then basename equality, then optional preview
 * `hdrFileName` / `ximFileName` hints when the cached key used a hdr basename fallback.
 */
export function resolveStxmCatalogEntryForScanId(
  scanId: string,
  catalog: readonly StxmCatalogEntry[],
  previewEntry?: DashboardPreviewSpectrumEntry,
): StxmCatalogEntry | undefined {
  const trimmedScanId = scanId.trim();
  if (!trimmedScanId) {
    return undefined;
  }

  const byRelativePath = catalog.find(
    (row) => row.relativePath === trimmedScanId,
  );
  if (byRelativePath) {
    return byRelativePath;
  }

  const scanBasename = trimmedScanId.split("/").pop()?.toLowerCase();
  if (scanBasename) {
    const byBasename = catalog.find(
      (row) => row.basename.toLowerCase() === scanBasename,
    );
    if (byBasename) {
      return byBasename;
    }
  }

  const hdrHint = previewEntry?.hdrFileName?.trim().toLowerCase();
  if (hdrHint) {
    const byHdr = catalog.find(
      (row) => row.basename.toLowerCase() === hdrHint,
    );
    if (byHdr) {
      return byHdr;
    }
  }

  const ximHint = previewEntry?.ximFileName?.trim().toLowerCase();
  if (ximHint?.endsWith(".xim")) {
    const hdrFromXim = ximHint.replace(/\.xim$/i, ".hdr");
    const byXim = catalog.find(
      (row) => row.basename.toLowerCase() === hdrFromXim,
    );
    if (byXim) {
      return byXim;
    }
  }

  return undefined;
}
