import {
  buildCatalogEntryFromHdr,
  scanThumbnailDataUrl,
  type StxmCatalogEntry,
  ximBasenamesForHdrBasename,
} from "~/lib/stxm";
import {
  isAllowedStxmFilename,
  validateStxmFilePair,
  validateStxmFileSize,
  validateStxmHdrMetadata,
} from "~/lib/stxm/validateStxmFile";
import { readHdr } from "~/lib/stxm/readHdr";
import {
  collectHdrFileRefs,
  countHdrFilesInDirectory,
  findXimFileForHdr,
  type StxmDirectoryHandle,
} from "./localDirectoryBrowser";
import type { StxmDirectoryLayout } from "./resolveDirectoryLayout";
import { getExperimentDirectory } from "./resolveDirectoryLayout";

export const BEAMTIME_CATALOG_BUILD_TIMEOUT_MS = 30_000;

export type EnrichCatalogThumbnailsOptions = {
  signal?: AbortSignal;
  onProgress?: (entries: StxmCatalogEntry[]) => void;
};

async function readHdrEntry(
  ref: Awaited<ReturnType<typeof collectHdrFileRefs>>[number],
): Promise<{ hdrText: string; hdrByteLength: number } | null> {
  try {
    const hdrFile = await ref.handle.getFile();
    validateStxmFileSize(hdrFile.size, "hdr");
    const hdrText = await hdrFile.text();
    validateStxmHdrMetadata(readHdr(hdrText));
    return { hdrText, hdrByteLength: hdrFile.size };
  } catch {
    return null;
  }
}

/**
 * Lists scan catalog entries from `.hdr` metadata only (no `.xim` reads or thumbnails).
 */
export async function buildBeamtimeCatalogFast(
  root: StxmDirectoryHandle,
  layout: StxmDirectoryLayout,
  experimentName: string,
): Promise<StxmCatalogEntry[]> {
  const experimentDir = await getExperimentDirectory(root, layout, experimentName);
  const hdrRefs = await collectHdrFileRefs(experimentDir);
  const entries: StxmCatalogEntry[] = [];

  for (const ref of hdrRefs) {
    if (!isAllowedStxmFilename(ref.name)) {
      continue;
    }
    const hdr = await readHdrEntry(ref);
    if (!hdr) {
      continue;
    }
    entries.push(
      buildCatalogEntryFromHdr(ref.name, ref.relativePath, hdr.hdrText, null),
    );
  }

  return entries;
}

/**
 * Loads `.xim` previews for catalog rows in the background and reports progressive updates.
 */
export async function enrichBeamtimeCatalogThumbnails(
  root: StxmDirectoryHandle,
  layout: StxmDirectoryLayout,
  experimentName: string,
  entries: StxmCatalogEntry[],
  options?: EnrichCatalogThumbnailsOptions,
): Promise<StxmCatalogEntry[]> {
  const experimentDir = await getExperimentDirectory(root, layout, experimentName);
  const updated = entries.map((entry) => ({ ...entry }));

  for (let index = 0; index < updated.length; index += 1) {
    if (options?.signal?.aborted) {
      break;
    }
    const entry = updated[index];
    if (!entry || entry.thumbnailDataUrl) {
      continue;
    }
    const parts = entry.relativePath.split("/");
    const hdrName = parts.pop() ?? entry.basename;
    let directory = experimentDir;
    try {
      for (const segment of parts) {
        directory = await directory.getDirectoryHandle(segment);
      }
      const hdrHandle = await directory.getFileHandle(hdrName);
      const hdrFile = await hdrHandle.getFile();
      validateStxmFileSize(hdrFile.size, "hdr");
      const hdrText = await hdrFile.text();
      const ximNames = ximBasenamesForHdrBasename(hdrName);
      const hdrRef = { name: hdrName, relativePath: entry.relativePath, handle: hdrHandle };
      const ximHandle = await findXimFileForHdr(hdrRef, ximNames, directory);
      if (!ximHandle) {
        continue;
      }
      const ximFile = await ximHandle.getFile();
      if (!isAllowedStxmFilename(ximFile.name)) {
        continue;
      }
      validateStxmFileSize(ximFile.size, "xim");
      const ximBuffer = await ximFile.arrayBuffer();
      const enriched = buildCatalogEntryFromHdr(
        entry.basename,
        entry.relativePath,
        hdrText,
        ximBuffer,
      );
      const thumbnailDataUrl = await scanThumbnailDataUrl(
        hdrText,
        ximBuffer,
        hdrFile.size,
      );
      updated[index] = {
        ...enriched,
        thumbnailDataUrl,
      };
      options?.onProgress?.(updated.slice());
    } catch {
      continue;
    }
  }

  return updated;
}

/**
 * Builds a scan catalog for one experiment directory with optional line-scan thumbnails.
 */
export async function buildBeamtimeCatalog(
  root: StxmDirectoryHandle,
  layout: StxmDirectoryLayout,
  experimentName: string,
  withThumbnails = true,
): Promise<StxmCatalogEntry[]> {
  const entries = await buildBeamtimeCatalogFast(root, layout, experimentName);
  if (!withThumbnails) {
    return entries;
  }
  return enrichBeamtimeCatalogThumbnails(root, layout, experimentName, entries);
}

/**
 * Counts `.hdr` files per experiment folder without parsing header contents.
 */
export async function countHdrFilesInExperiments(
  root: StxmDirectoryHandle,
  layout: StxmDirectoryLayout,
  experimentNames: string[],
): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  if (layout.mode === "single-experiment") {
    counts.set(layout.displayName, await countHdrFilesInDirectory(root));
    return counts;
  }
  for (const name of experimentNames) {
    try {
      const experimentDir = await root.getDirectoryHandle(name);
      counts.set(name, await countHdrFilesInDirectory(experimentDir));
    } catch {
      counts.set(name, 0);
    }
  }
  return counts;
}

/**
 * Loads paired `.hdr` and `.xim` files for a catalog entry from an experiment folder.
 */
export async function loadScanFilesFromCatalogEntry(
  root: StxmDirectoryHandle,
  layout: StxmDirectoryLayout,
  experimentName: string,
  entry: StxmCatalogEntry,
): Promise<{ hdrFile: File; ximFile: File } | null> {
  const experimentDir = await getExperimentDirectory(root, layout, experimentName);
  const parts = entry.relativePath.split("/");
  const hdrName = parts.pop() ?? entry.basename;
  let directory = experimentDir;
  for (const segment of parts) {
    directory = await directory.getDirectoryHandle(segment);
  }
  try {
    const hdrHandle = await directory.getFileHandle(hdrName);
    const hdrFile = await hdrHandle.getFile();
    const ximNames = ximBasenamesForHdrBasename(hdrName);
    for (const candidate of ximNames) {
      try {
        const ximHandle = await directory.getFileHandle(candidate);
        const ximFile = await ximHandle.getFile();
        validateStxmFilePair(hdrFile, ximFile);
        return { hdrFile, ximFile };
      } catch {
        continue;
      }
    }
    return null;
  } catch {
    return null;
  }
}
