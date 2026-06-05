import {
  buildCatalogEntryFromHdr,
  isExperimentFolderName,
  isNexafsLineScanType,
  lineScanThumbnailDataUrl,
  type StxmCatalogEntry,
  ximBasenamesForHdrBasename,
} from "~/lib/stxm";
import {
  collectHdrFileRefs,
  findXimFileForHdr,
  type StxmDirectoryHandle,
} from "./localDirectoryBrowser";

/**
 * Builds a scan catalog for one beamtime subdirectory with optional line-scan thumbnails.
 */
export async function buildBeamtimeCatalog(
  root: StxmDirectoryHandle,
  beamtimeName: string,
  withThumbnails = true,
): Promise<StxmCatalogEntry[]> {
  const beamtimeDir = await root.getDirectoryHandle(beamtimeName);
  const hdrRefs = await collectHdrFileRefs(beamtimeDir);
  const entries: StxmCatalogEntry[] = [];

  for (const ref of hdrRefs) {
    const hdrFile = await ref.handle.getFile();
    const hdrText = await hdrFile.text();
    const ximNames = ximBasenamesForHdrBasename(ref.name);
    const ximHandle = await findXimFileForHdr(ref, ximNames, beamtimeDir);
    let ximBuffer: ArrayBuffer | null = null;
    if (ximHandle) {
      ximBuffer = await (await ximHandle.getFile()).arrayBuffer();
    }
    const entry = buildCatalogEntryFromHdr(
      ref.name,
      ref.relativePath,
      hdrText,
      ximBuffer,
    );
    if (withThumbnails && entry.isNexafsLineScan && ximBuffer) {
      entry.thumbnailDataUrl = await lineScanThumbnailDataUrl(hdrText, ximBuffer);
    }
    entries.push(entry);
  }

  return entries;
}

/**
 * Counts scans and NEXAFS line scans per immediate beamtime child folder (fast hdr-only pass).
 */
export async function countScansInBeamtimes(
  root: StxmDirectoryHandle,
  beamtimeNames: string[],
): Promise<Map<string, { total: number; nexafs: number }>> {
  const counts = new Map<string, { total: number; nexafs: number }>();
  for (const name of beamtimeNames) {
    if (!isExperimentFolderName(name)) {
      continue;
    }
    try {
      const beamtimeDir = await root.getDirectoryHandle(name);
      const hdrRefs = await collectHdrFileRefs(beamtimeDir);
      let nexafs = 0;
      for (const ref of hdrRefs) {
        const hdrText = await (await ref.handle.getFile()).text();
        if (isNexafsLineScanType(hdrText)) {
          nexafs += 1;
        }
      }
      counts.set(name, { total: hdrRefs.length, nexafs });
    } catch {
      counts.set(name, { total: 0, nexafs: 0 });
    }
  }
  return counts;
}

/**
 * Loads paired `.hdr` and `.xim` files for a catalog entry from a beamtime folder.
 */
export async function loadScanFilesFromCatalogEntry(
  root: StxmDirectoryHandle,
  beamtimeName: string,
  entry: StxmCatalogEntry,
): Promise<{ hdrFile: File; ximFile: File } | null> {
  const beamtimeDir = await root.getDirectoryHandle(beamtimeName);
  const parts = entry.relativePath.split("/");
  const hdrName = parts.pop() ?? entry.basename;
  let directory = beamtimeDir;
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
