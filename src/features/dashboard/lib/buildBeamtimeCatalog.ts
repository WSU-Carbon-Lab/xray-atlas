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

/**
 * Builds a scan catalog for one experiment directory with optional line-scan thumbnails.
 */
export async function buildBeamtimeCatalog(
  root: StxmDirectoryHandle,
  layout: StxmDirectoryLayout,
  experimentName: string,
  withThumbnails = true,
): Promise<StxmCatalogEntry[]> {
  const experimentDir = await getExperimentDirectory(root, layout, experimentName);
  const hdrRefs = await collectHdrFileRefs(experimentDir);
  const entries: StxmCatalogEntry[] = [];

  for (const ref of hdrRefs) {
    if (!isAllowedStxmFilename(ref.name)) {
      continue;
    }
    let hdrFile: File;
    try {
      hdrFile = await ref.handle.getFile();
      validateStxmFileSize(hdrFile.size, "hdr");
    } catch {
      continue;
    }
    const hdrText = await hdrFile.text();
    try {
      validateStxmHdrMetadata(readHdr(hdrText));
    } catch {
      continue;
    }
    const ximNames = ximBasenamesForHdrBasename(ref.name);
    const ximHandle = await findXimFileForHdr(ref, ximNames, experimentDir);
    let ximBuffer: ArrayBuffer | null = null;
    if (ximHandle) {
      try {
        const ximFile = await ximHandle.getFile();
        if (!isAllowedStxmFilename(ximFile.name)) {
          ximBuffer = null;
        } else {
          validateStxmFileSize(ximFile.size, "xim");
          ximBuffer = await ximFile.arrayBuffer();
        }
      } catch {
        ximBuffer = null;
      }
    }
    const entry = buildCatalogEntryFromHdr(
      ref.name,
      ref.relativePath,
      hdrText,
      ximBuffer,
    );
    if (withThumbnails && ximBuffer) {
      entry.thumbnailDataUrl = await scanThumbnailDataUrl(
        hdrText,
        ximBuffer,
        hdrFile.size,
      );
    }
    entries.push(entry);
  }

  return entries;
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
