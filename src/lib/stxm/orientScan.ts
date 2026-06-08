import type { StxmHdrMetadata, StxmOrientedScan } from "./types";

function axisIsEnergy(name: string): boolean {
  const lowered = name.toLowerCase();
  return (
    lowered.includes("energy") ||
    lowered.endsWith("ev") ||
    lowered.includes("photon")
  );
}

function isStrictlyMonotonic(axis: Float64Array): boolean {
  if (axis.length < 2) {
    return axis.length === 1;
  }
  const increasing = axis[1]! > axis[0]!;
  for (let i = 2; i < axis.length; i += 1) {
    const diff = axis[i]! - axis[i - 1]!;
    if (diff === 0) {
      return false;
    }
    if (increasing && diff <= 0) {
      return false;
    }
    if (!increasing && diff >= 0) {
      return false;
    }
  }
  return true;
}

function cloneRows(rows: Float64Array[]): Float64Array[] {
  return rows.map((row) => Float64Array.from(row));
}

function transposeRows(rows: Float64Array[]): Float64Array[] {
  const nRows = rows.length;
  const nCols = rows[0]?.length ?? 0;
  const out: Float64Array[] = [];
  for (let col = 0; col < nCols; col += 1) {
    const next = new Float64Array(nRows);
    for (let row = 0; row < nRows; row += 1) {
      next[row] = rows[row]?.[col] ?? Number.NaN;
    }
    out.push(next);
  }
  return out;
}

/**
 * Orients a raw STXM image to `(nSpatial, nEnergy)` using header axis names and
 * coordinate arrays, matching Python `stxm.io.orient_scan`.
 *
 * @param meta - Parsed `.hdr` metadata including `paxisPoints` and `qaxisPoints`.
 * @param image - Raw 2D intensities from `readXim`.
 * @returns Energy axis, spatial axis, and oriented image rows.
 * @throws {Error} When axis sizes disagree with the array or energy is not monotonic.
 */
export function orientScan(
  meta: StxmHdrMetadata,
  image: Float64Array[],
): StxmOrientedScan {
  if (!meta.paxisPoints || !meta.qaxisPoints) {
    throw new Error("Header missing paxis_points or qaxis_points for orientation");
  }

  const paxis = meta.paxisPoints;
  const qaxis = meta.qaxisPoints;
  let rows = cloneRows(image);
  const pName = meta.paxisName ?? "PAxis";
  const qName = meta.qaxisName ?? "QAxis";
  const energyOnP = axisIsEnergy(pName);
  const energyOnQ = axisIsEnergy(qName);

  let spatial = qaxis;
  let energy = paxis;

  if (rows.length === qaxis.length && (rows[0]?.length ?? 0) === paxis.length) {
    spatial = qaxis;
    energy = paxis;
  } else if (
    rows.length === paxis.length &&
    (rows[0]?.length ?? 0) === qaxis.length
  ) {
    rows = transposeRows(rows);
    spatial = qaxis;
    energy = paxis;
  } else {
    throw new Error(
      `image shape (${rows.length}, ${rows[0]?.length ?? 0}) incompatible with qaxis=${qaxis.length} paxis=${paxis.length}`,
    );
  }

  if (energyOnQ && !energyOnP) {
    rows = transposeRows(rows);
    spatial = paxis;
    energy = qaxis;
  }

  if (!isStrictlyMonotonic(energy)) {
    throw new Error("energy axis must be strictly monotonic");
  }

  if (rows.length !== spatial.length || (rows[0]?.length ?? 0) !== energy.length) {
    throw new Error("oriented image shape does not match axis lengths");
  }

  return { energyEv: energy, spatial, image: rows };
}
