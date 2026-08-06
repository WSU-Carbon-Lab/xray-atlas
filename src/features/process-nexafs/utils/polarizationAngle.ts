/**
 * Polarization geometry angle bounds for NEXAFS upload and persistence.
 *
 * Matches the `polarizations_polardeg_check` / `polarizations_azimuthdeg_check`
 * Postgres constraints. Polar allows laboratory motor angles outside the classic
 * 0-180 NEXAFS dichroism range (for example RSoXS `210deg` labels).
 */

/** Inclusive lower bound for polardeg (degrees). */
export const POLAR_DEG_MIN = -360;

/** Inclusive upper bound for polardeg (degrees). */
export const POLAR_DEG_MAX = 360;

/** Inclusive lower bound for azimuthdeg (degrees). */
export const AZIMUTH_DEG_MIN = 0;

/** Exclusive upper bound for azimuthdeg (degrees). */
export const AZIMUTH_DEG_MAX_EXCLUSIVE = 360;

/**
 * Returns whether `theta` is a finite polar angle allowed for `polarizations.polardeg`.
 */
export function isValidPolarDeg(theta: number): boolean {
  return (
    Number.isFinite(theta) && theta >= POLAR_DEG_MIN && theta <= POLAR_DEG_MAX
  );
}

/**
 * Returns whether `phi` is a finite azimuth angle allowed for `polarizations.azimuthdeg`.
 */
export function isValidAzimuthDeg(phi: number): boolean {
  return (
    Number.isFinite(phi) &&
    phi >= AZIMUTH_DEG_MIN &&
    phi < AZIMUTH_DEG_MAX_EXCLUSIVE
  );
}

/**
 * Parses a string or number into a finite float, or `null` when empty or non-numeric.
 */
export function parseFiniteAngleDegrees(
  value: string | number | null | undefined,
): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  const trimmed = value.trim();
  if (trimmed === "") return null;
  const parsed = Number.parseFloat(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * Describes a polar/azimuth pair that fails the database angle constraints.
 */
export function describeInvalidPolarizationGeometry(
  theta: number,
  phi: number,
): string | null {
  const polarOk = isValidPolarDeg(theta);
  const azimuthOk = isValidAzimuthDeg(phi);
  if (polarOk && azimuthOk) return null;
  const parts: string[] = [];
  if (!polarOk) {
    parts.push(
      `theta (polar) ${theta}° is outside [${POLAR_DEG_MIN}, ${POLAR_DEG_MAX}]`,
    );
  }
  if (!azimuthOk) {
    parts.push(
      `phi (azimuth) ${phi}° is outside [${AZIMUTH_DEG_MIN}, ${AZIMUTH_DEG_MAX_EXCLUSIVE})`,
    );
  }
  return parts.join("; ");
}
