/**
 * Loads per-experiment polarization geometry keys used to gate similar-pair
 * listing. Pair scoring and merge candidacy live in `dataset-similarity`.
 *
 * Does not authorize edit access; callers pass already-filtered experiment ids.
 */

import {
  SPECTRUM_FIXED_GEOMETRY_KEY,
  spectrumGeometryKey,
} from "~/lib/nexafs/spectrum-geometry-key";
import type { PrismaClient } from "~/prisma/client";

/**
 * Collects distinct geometry keys for each experiment from spectrum-point
 * polarizations (`theta:phi`, or `fixed` when `polarizationid` is null).
 *
 * @param db - Prisma client (pooled app DB).
 * @param experimentIds - Experiment UUIDs to load. Empty input returns an empty map.
 * @returns Map from experiment id to unique geometry keys (insertion order).
 */
export async function geometryKeysByExperimentId(
  db: PrismaClient,
  experimentIds: readonly string[],
): Promise<Map<string, string[]>> {
  const result = new Map<string, string[]>();
  for (const id of experimentIds) {
    result.set(id, []);
  }
  if (experimentIds.length === 0) {
    return result;
  }

  const groups = await db.spectrumpoints.groupBy({
    by: ["experimentid", "polarizationid"],
    where: { experimentid: { in: [...experimentIds] } },
  });

  const polarizationIds: string[] = [];
  const seenPolarizationIds = new Set<string>();
  for (const group of groups) {
    if (group.polarizationid == null) {
      continue;
    }
    if (seenPolarizationIds.has(group.polarizationid)) {
      continue;
    }
    seenPolarizationIds.add(group.polarizationid);
    polarizationIds.push(group.polarizationid);
  }

  const polarizations =
    polarizationIds.length === 0
      ? []
      : await db.polarizations.findMany({
          where: { id: { in: polarizationIds } },
          select: { id: true, polardeg: true, azimuthdeg: true },
        });
  const keyByPolarizationId = new Map<string, string>();
  for (const row of polarizations) {
    const theta = Number(row.polardeg);
    const phi = Number(row.azimuthdeg);
    const key =
      Number.isFinite(theta) && Number.isFinite(phi)
        ? spectrumGeometryKey(theta, phi)
        : SPECTRUM_FIXED_GEOMETRY_KEY;
    keyByPolarizationId.set(row.id, key);
  }

  const seenByExperiment = new Map<string, Set<string>>();
  for (const group of groups) {
    const keys = result.get(group.experimentid);
    if (!keys) {
      continue;
    }
    const key =
      group.polarizationid == null
        ? SPECTRUM_FIXED_GEOMETRY_KEY
        : (keyByPolarizationId.get(group.polarizationid) ??
          SPECTRUM_FIXED_GEOMETRY_KEY);
    let seen = seenByExperiment.get(group.experimentid);
    if (!seen) {
      seen = new Set<string>();
      seenByExperiment.set(group.experimentid, seen);
    }
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    keys.push(key);
  }

  return result;
}
