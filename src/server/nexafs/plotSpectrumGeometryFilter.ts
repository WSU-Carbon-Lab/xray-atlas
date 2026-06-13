import type { Prisma } from "~/prisma/client";

/**
 * Parses plot-viewer geometry keys (`theta:phi` or `fixed`) into Prisma `spectrumpoints` where fragments.
 *
 * @param geometryKeys Stable geometry keys from the plot viewer URL or STXM preview session.
 * @returns An `OR` list suitable for `spectrumpoints.findMany({ where })`, or `null` when no filter applies.
 */
export function spectrumpointsWhereForPlotGeometryKeys(
  geometryKeys: readonly string[],
): Prisma.spectrumpointsWhereInput | null {
  if (geometryKeys.length === 0) {
    return null;
  }

  const or: Prisma.spectrumpointsWhereInput[] = [];
  for (const key of geometryKeys) {
    if (key === "fixed") {
      or.push({ polarizationid: null });
      continue;
    }
    const separator = key.indexOf(":");
    if (separator <= 0) {
      continue;
    }
    const theta = Number(key.slice(0, separator));
    const phi = Number(key.slice(separator + 1));
    if (!Number.isFinite(theta) || !Number.isFinite(phi)) {
      continue;
    }
    or.push({
      polarizations: {
        polardeg: theta,
        azimuthdeg: phi,
      },
    });
  }

  if (or.length === 0) {
    return null;
  }
  return { OR: or };
}
