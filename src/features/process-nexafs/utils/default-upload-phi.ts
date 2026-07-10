/** Default azimuth angle (degrees) when uploads omit a phi column or fixed value. */
export const DEFAULT_UPLOAD_PHI_DEGREES = 0;

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
    return Number.isFinite(parseFloat(trimmed));
  }
  return false;
}
