/** Default azimuth angle (degrees) when uploads omit a phi column or fixed value. */
export const DEFAULT_UPLOAD_PHI_DEGREES = 0;

const STRICT_FINITE_NUMBER_PATTERN = /^-?\d+(\.\d+)?$/;

/**
 * Returns true when `value` is a trimmed decimal numeral with no suffixes or extra characters.
 */
export function isStrictFiniteNumberString(value: string): boolean {
  const trimmed = value.trim();
  if (!STRICT_FINITE_NUMBER_PATTERN.test(trimmed)) {
    return false;
  }
  return Number.isFinite(Number(trimmed));
}

/**
 * Parses a strict decimal numeral string to a finite number, or returns null when invalid.
 */
export function parseStrictFiniteNumber(value: string): number | null {
  if (!isStrictFiniteNumberString(value)) {
    return null;
  }
  const parsed = Number(value.trim());
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * Resolves the effective fixed phi string for upload geometry, defaulting missing phi to zero.
 */
export function resolveUploadFixedPhi(
  fixedPhi: string | undefined,
  hasPhiColumn: boolean,
): string | undefined {
  if (hasPhiColumn) {
    return fixedPhi;
  }
  if (fixedPhi != null && fixedPhi.trim() !== "") {
    return fixedPhi;
  }
  return String(DEFAULT_UPLOAD_PHI_DEGREES);
}

/**
 * Resolves azimuth (phi) for one spectrum upload row.
 *
 * Uses a finite numeric CSV/JSON cell when present and non-blank. Blank or
 * missing cells use `fixedPhi` when set, otherwise {@link DEFAULT_UPLOAD_PHI_DEGREES}.
 * Non-numeric non-blank cells return `null` so callers can leave phi unset and
 * surface a geometry error instead of silently coercing bad values.
 *
 * @param rawCell - Raw phi cell from a mapped column, or `undefined` when no phi column is mapped.
 * @param fixedPhi - Optional fixed azimuth string from the upload form.
 * @returns Finite phi in degrees, or `null` when the cell is non-blank but not a finite number.
 */
export function resolveUploadRowPhi(
  rawCell: string | number | null | undefined,
  fixedPhi: string | undefined,
): number | null {
  if (rawCell !== undefined && rawCell !== null) {
    const trimmed = String(rawCell).trim();
    if (trimmed !== "") {
      return parseStrictFiniteNumber(trimmed);
    }
  }
  if (fixedPhi != null && fixedPhi.trim() !== "") {
    return parseStrictFiniteNumber(fixedPhi);
  }
  return DEFAULT_UPLOAD_PHI_DEGREES;
}

/**
 * Fills missing finite phi on spectrum points with the upload default (or `fixedPhi`).
 *
 * Leaves points unchanged when phi is already finite. Used at submit so CSV
 * geometry mode still produces entries when a mapped phi column was blank.
 *
 * @param points - Spectrum rows that may omit phi after parse.
 * @param fixedPhi - Optional fixed azimuth string from the upload form.
 * @returns New array with default phi applied where needed.
 */
export function applyDefaultUploadPhiToPoints<
  T extends { phi?: number },
>(points: readonly T[], fixedPhi: string | undefined): T[] {
  return points.map((point) => {
    if (typeof point.phi === "number" && Number.isFinite(point.phi)) {
      return point;
    }
    const resolved = resolveUploadRowPhi(undefined, fixedPhi);
    if (resolved === null) {
      return point;
    }
    return { ...point, phi: resolved };
  });
}

/**
 * Returns true when theta/phi geometry is satisfied for upload validation and ingest.
 */
export function uploadGeometryIsComplete(args: {
  readonly hasThetaColumn: boolean;
  readonly hasPhiColumn: boolean;
  readonly fixedTheta: string | undefined;
  readonly fixedPhi: string | undefined;
}): boolean {
  if (args.hasThetaColumn && args.hasPhiColumn) {
    return true;
  }
  if (args.hasThetaColumn && !args.hasPhiColumn) {
    return true;
  }
  if (!args.hasThetaColumn && !args.hasPhiColumn) {
    const trimmed = args.fixedTheta?.trim();
    if (!trimmed) {
      return false;
    }
    return isStrictFiniteNumberString(trimmed);
  }
  return false;
}
