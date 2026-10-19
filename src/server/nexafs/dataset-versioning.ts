/**
 * Pure dataset version arithmetic for NEXAFS experiments.
 *
 * Owns the `major.minor.patch` value type, the mapping from change kinds to bump levels, and
 * string formatting and parsing. It does not touch the database, Zenodo, or authorization; see
 * {@link ./apply-versioned-change.ts} for persistence.
 *
 * No change kind produces a major bump yet: major is reserved for a new spectrum upload, which is
 * not built. The `"major"` level and its arithmetic exist so the scheme stays stable when it ships.
 */

/** Dataset version as stored on `experiments.dataset_version_{major,minor,patch}`. */
export type DatasetVersion = { major: number; minor: number; patch: number };

/** Semantic level of a version bump. */
export type VersionBumpLevel = "major" | "minor" | "patch";

/** Edit that advances a dataset version when confirmed. */
export type DatasetChangeKind =
  | "normalization"
  | "kk_first_calculation"
  | "kk_recalculation"
  | "aux_added"
  | "aux_removed";

const LEVEL_RANK: Record<VersionBumpLevel, number> = {
  patch: 0,
  minor: 1,
  major: 2,
};

/**
 * Bump level for one change kind: `normalization`, `kk_first_calculation`, and
 * `kk_recalculation` are `patch`; `aux_added` and `aux_removed` are `minor`.
 * No kind maps to `major` yet.
 */
export function bumpLevelForChange(kind: DatasetChangeKind): VersionBumpLevel {
  switch (kind) {
    case "normalization":
    case "kk_first_calculation":
    case "kk_recalculation":
      return "patch";
    case "aux_added":
    case "aux_removed":
      return "minor";
    default: {
      const exhaustive: never = kind;
      throw new Error(`Unhandled dataset change kind: ${String(exhaustive)}`);
    }
  }
}

/**
 * Highest level in `levels` under the order `patch < minor < major`.
 * Throws when `levels` is empty, because a bump needs at least one change.
 */
export function highestBumpLevel(
  levels: readonly VersionBumpLevel[],
): VersionBumpLevel {
  const first = levels[0];
  if (first === undefined) {
    throw new Error("highestBumpLevel requires at least one level");
  }
  let best = first;
  for (const level of levels) {
    if (LEVEL_RANK[level] > LEVEL_RANK[best]) best = level;
  }
  return best;
}

/**
 * Version after applying `level` to `current`: the bumped part increments by one and every
 * lower part resets to zero (`1.0.2` with `minor` gives `1.1.0`).
 */
export function nextDatasetVersion(
  current: DatasetVersion,
  level: VersionBumpLevel,
): DatasetVersion {
  switch (level) {
    case "major":
      return { major: current.major + 1, minor: 0, patch: 0 };
    case "minor":
      return { major: current.major, minor: current.minor + 1, patch: 0 };
    case "patch":
      return {
        major: current.major,
        minor: current.minor,
        patch: current.patch + 1,
      };
    default: {
      const exhaustive: never = level;
      throw new Error(`Unhandled bump level: ${String(exhaustive)}`);
    }
  }
}

/** Version rendered as `"M.m.p"`, the string sent to Zenodo as `version`. */
export function formatDatasetVersion(v: DatasetVersion): string {
  return `${v.major}.${v.minor}.${v.patch}`;
}

const VERSION_PATTERN = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;

/**
 * Parses `"M.m.p"` into a {@link DatasetVersion}. Each part must be a non-negative integer
 * without leading zeros; throws an `Error` on any other input.
 */
export function parseDatasetVersion(s: string): DatasetVersion {
  const match = VERSION_PATTERN.exec(s);
  if (!match) {
    throw new Error(`Malformed dataset version: ${JSON.stringify(s)}`);
  }
  const major = Number(match[1]);
  const minor = Number(match[2]);
  const patch = Number(match[3]);
  if (
    !Number.isSafeInteger(major) ||
    !Number.isSafeInteger(minor) ||
    !Number.isSafeInteger(patch)
  ) {
    throw new Error(`Dataset version part out of range: ${JSON.stringify(s)}`);
  }
  return { major, minor, patch };
}
