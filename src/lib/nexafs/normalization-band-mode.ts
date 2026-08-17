/**
 * Normalization band selection: which pre/post windows participate in the fit and
 * which hatched previews to show. Does not own energy window geometry (that stays on
 * `NormalizationRegions`); deliberately excludes channel-scope (`unified` / `per_channel`).
 */

/** Which edge windows drive the affine normalization transform. */
export type NormalizationBandMode = "both" | "pre" | "post";

const BAND_MODES = ["both", "pre", "post"] as const satisfies readonly NormalizationBandMode[];

/**
 * Parses a stored `bandMode` token from normalization JSON; unknown values fall back to `both`.
 *
 * @param value - Raw JSON field (string or other).
 * @returns Canonical {@link NormalizationBandMode}.
 */
export function parseNormalizationBandMode(value: unknown): NormalizationBandMode {
  if (typeof value === "string") {
    const trimmed = value.trim().toLowerCase();
    if ((BAND_MODES as readonly string[]).includes(trimmed)) {
      return trimmed as NormalizationBandMode;
    }
  }
  return "both";
}

/**
 * Resolves which pre/post windows are active for fitting and shading under `mode`.
 *
 * @param regions - Stored contributor windows (inactive side may still hold a span).
 * @param mode - Active band policy.
 * @returns Windows with the inactive side forced to `null`.
 */
export function activeNormalizationRegions(
  regions: {
    pre: [number, number] | null;
    post: [number, number] | null;
  },
  mode: NormalizationBandMode,
): {
  pre: [number, number] | null;
  post: [number, number] | null;
} {
  switch (mode) {
    case "both":
      return { pre: regions.pre, post: regions.post };
    case "pre":
      return { pre: regions.pre, post: null };
    case "post":
      return { pre: null, post: regions.post };
    default: {
      const _exhaustive: never = mode;
      return _exhaustive;
    }
  }
}

/**
 * Reports whether `mode` has enough stored windows to attempt a normalization fit.
 *
 * @param regions - Contributor windows.
 * @param mode - Active band policy.
 */
export function normalizationBandModeIsReady(
  regions: {
    pre: [number, number] | null;
    post: [number, number] | null;
  },
  mode: NormalizationBandMode,
): boolean {
  const active = activeNormalizationRegions(regions, mode);
  switch (mode) {
    case "both":
      return active.pre != null && active.post != null;
    case "pre":
      return active.pre != null;
    case "post":
      return active.post != null;
    default: {
      const _exhaustive: never = mode;
      return _exhaustive;
    }
  }
}
