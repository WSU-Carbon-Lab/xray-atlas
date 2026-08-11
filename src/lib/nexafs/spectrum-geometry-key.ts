/**
 * Order-preserving polarization geometry keys shared by upload uniqueness,
 * plot legends, plot-viewer URL state, and server spectrum filters.
 *
 * Wire format is `theta:phi` (for example `90:45`) or `fixed` when angles are
 * absent. `(90, 45)` and `(45, 90)` are distinct; never sort, min/max, or
 * otherwise canonicalize the pair into a commutative key.
 */

/** Sentinel used when a spectrum has no finite θ/φ metadata. */
export const SPECTRUM_FIXED_GEOMETRY_KEY = "fixed";

/**
 * Builds the canonical ordered geometry key for one polarization.
 *
 * @param theta Polar angle in degrees (finite).
 * @param phi Azimuthal angle in degrees (finite).
 */
export function spectrumGeometryKey(theta: number, phi: number): string {
  return `${theta}:${phi}`;
}

/**
 * Parses a {@link spectrumGeometryKey} or {@link SPECTRUM_FIXED_GEOMETRY_KEY}
 * value into finite angles when present.
 *
 * @param key Geometry key from plot traces, URL state, or upload grouping.
 */
export function parseSpectrumGeometryKey(
  key: string,
): { theta: number; phi: number } | null {
  if (key === SPECTRUM_FIXED_GEOMETRY_KEY) {
    return null;
  }
  const separator = key.indexOf(":");
  if (separator <= 0) {
    return null;
  }
  const theta = Number(key.slice(0, separator));
  const phi = Number(key.slice(separator + 1));
  if (!Number.isFinite(theta) || !Number.isFinite(phi)) {
    return null;
  }
  return { theta, phi };
}

/**
 * Builds a geometry key from optional angles on a spectrum row.
 *
 * @param point Row that may carry finite `theta` and `phi`.
 * @returns `theta:phi` when both angles are finite; otherwise `fixed`.
 */
export function spectrumGeometryKeyFromPoint(point: {
  readonly theta?: number;
  readonly phi?: number;
}): string {
  const theta = point.theta;
  const phi = point.phi;
  if (
    typeof theta !== "number" ||
    !Number.isFinite(theta) ||
    typeof phi !== "number" ||
    !Number.isFinite(phi)
  ) {
    return SPECTRUM_FIXED_GEOMETRY_KEY;
  }
  return spectrumGeometryKey(theta, phi);
}
