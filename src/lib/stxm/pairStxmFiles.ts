/**
 * Helpers for pairing STXM `.hdr` and `.xim` auxiliary files by basename rules.
 */

export type StxmAuxFileRef = {
  id: string;
  originalFilename: string;
};

export type DiscoveredStxmPair = {
  hdrFileName: string;
  ximFileName: string;
  hdrExperimentFileId: string;
  ximExperimentFileId: string;
};

/** Returns candidate `.xim` filenames for a given `.hdr` basename. */
export function candidateXimNamesForHdr(hdrName: string): string[] {
  const base = hdrName.replace(/\.hdr$/i, "");
  return [`${base}_a.xim`, `${base}.xim`, hdrName.replace(/\.hdr$/i, ".xim")];
}

/**
 * Discovers complete STXM pairs from experiment-aux file rows using ALS naming conventions.
 */
export function discoverStxmPairsFromAuxFiles(
  files: StxmAuxFileRef[],
): DiscoveredStxmPair[] {
  const byName = new Map(
    files.map((file) => [file.originalFilename.toLowerCase(), file]),
  );
  const pairs: DiscoveredStxmPair[] = [];
  const seenHdr = new Set<string>();

  for (const file of files) {
    if (!file.originalFilename.toLowerCase().endsWith(".hdr")) {
      continue;
    }
    const hdrKey = file.originalFilename.toLowerCase();
    if (seenHdr.has(hdrKey)) {
      continue;
    }
    const xim = candidateXimNamesForHdr(file.originalFilename)
      .map((name) => byName.get(name.toLowerCase()))
      .find((row) => row !== undefined);
    if (!xim) {
      continue;
    }
    seenHdr.add(hdrKey);
    pairs.push({
      hdrFileName: file.originalFilename,
      ximFileName: xim.originalFilename,
      hdrExperimentFileId: file.id,
      ximExperimentFileId: xim.id,
    });
  }
  return pairs;
}

/** Resolves experiment file ids by exact original filename match after upload. */
export function mapAuxFilesByFilename(
  files: StxmAuxFileRef[],
): Map<string, string> {
  return new Map(
    files.map((file) => [file.originalFilename.toLowerCase(), file.id]),
  );
}
