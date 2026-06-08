/**
 * Matches ALS beamtime folder names such as `2025_10(October)`, `2026-03(March)`,
 * `2024_06`, or `2024_06 (June)`.
 */
export const EXPERIMENT_FOLDER_PATTERN =
  /^\d{4}[-_.]\d{1,2}(?:\s*\([^)]+\))?$/;

/**
 * Returns true when `name` matches the beamtime experiment folder naming convention.
 */
export function isExperimentFolderName(name: string): boolean {
  return EXPERIMENT_FOLDER_PATTERN.test(name.trim());
}

function isVisibleChildDirectoryName(name: string): boolean {
  const trimmed = name.trim();
  return trimmed.length > 0 && !trimmed.startsWith(".");
}

/**
 * Lists beamtime experiment folders under a beamline root.
 *
 * When at least one immediate child matches {@link isExperimentFolderName}, every
 * visible sibling directory is included (parity with the standalone STXM app).
 * Otherwise only dated folder names are returned.
 */
export function listBeamtimeExperimentFolders(childNames: string[]): string[] {
  const visible = childNames.filter(isVisibleChildDirectoryName);
  if (visible.some(isExperimentFolderName)) {
    return sortExperimentFolderNames(visible);
  }
  return sortExperimentFolderNames(visible.filter(isExperimentFolderName));
}

/**
 * Builds a descending sort key `(year, month, name)` for beamtime folder names.
 */
export function experimentSortKey(name: string): [number, number, string] {
  let base = name.trim();
  if (base.includes("(")) {
    base = base.split("(")[0] ?? base;
  }
  base = base.replace(/_/g, "-").replace(/\./g, "-");
  const parts = base.split("-");
  const year = Number.parseInt(parts[0] ?? "", 10);
  const month =
    parts.length > 1 ? Number.parseInt(parts[1] ?? "1", 10) : 1;
  if (Number.isNaN(year)) {
    return [0, 0, name];
  }
  return [year, Number.isNaN(month) ? 1 : month, name];
}

/**
 * Sorts beamtime folder names newest-first using {@link experimentSortKey}.
 */
export function sortExperimentFolderNames(names: string[]): string[] {
  return [...names].sort((a, b) => {
    const keyA = experimentSortKey(a);
    const keyB = experimentSortKey(b);
    if (keyA[0] !== keyB[0]) {
      return keyB[0] - keyA[0];
    }
    if (keyA[1] !== keyB[1]) {
      return keyB[1] - keyA[1];
    }
    return keyB[2].localeCompare(keyA[2]);
  });
}

export type BeamtimeFolderSummary = {
  name: string;
  scanCount: number;
  nexafsLineScanCount: number;
};

/**
 * Summarizes immediate child directories under a root as beamtime folders.
 */
export function summarizeBeamtimeFolders(
  childNames: string[],
  scanCounts: Map<string, { total: number; nexafs: number }>,
): BeamtimeFolderSummary[] {
  const beamtimes = listBeamtimeExperimentFolders(childNames);
  return beamtimes.map((name) => {
    const counts = scanCounts.get(name) ?? { total: 0, nexafs: 0 };
    return {
      name,
      scanCount: counts.total,
      nexafsLineScanCount: counts.nexafs,
    };
  });
}
