import type { StxmIzeroBounds, StxmSampleRegion } from "./stxm-region-types";

/**
 * Izero exclusivity rules for STXM sample regions.
 *
 * - Sample/film regions may cross each other freely (boundaries can pass).
 * - No sample region may occupy the open izero interior `(izeroLo, izeroHi)`.
 * - Touching izero edges at `izeroLo` or `izeroHi` is allowed.
 * - Izero boundaries may move through sample regions; sample edges are pushed out afterward.
 */

/**
 * Returns whether the open interval `(lo, hi)` intersects the open izero interior.
 *
 * @param lo - Lower sample bound (need not be ordered with `hi`).
 * @param hi - Upper sample bound.
 * @param izero - Izero reference band bounds.
 */
export function sampleRangeOverlapsIzeroInterior(
  lo: number,
  hi: number,
  izero: StxmIzeroBounds,
): boolean {
  const regionLo = Math.min(lo, hi);
  const regionHi = Math.max(lo, hi);
  const overlapLo = Math.max(regionLo, izero.izeroLo);
  const overlapHi = Math.min(regionHi, izero.izeroHi);
  return overlapLo < overlapHi;
}

/**
 * Clamps one sample edge so the edge value does not lie strictly inside izero.
 *
 * @param edgeValue - Candidate edge coordinate on the spatial axis.
 * @param izero - Izero reference band bounds.
 * @returns `edgeValue` when outside izero interior, otherwise the nearer izero boundary.
 */
export function clampSampleEdgeOutsideIzeroInterior(
  edgeValue: number,
  izero: StxmIzeroBounds,
): number {
  if (edgeValue <= izero.izeroLo || edgeValue >= izero.izeroHi) {
    return edgeValue;
  }
  const distLo = edgeValue - izero.izeroLo;
  const distHi = izero.izeroHi - edgeValue;
  return distLo <= distHi ? izero.izeroLo : izero.izeroHi;
}

/**
 * Resolves a sample region so it no longer overlaps the open izero interior while
 * preserving `minGap` width and staying within `[sampleMin, sampleMax]`.
 *
 * When the region is fully enclosed by izero, it slides to the nearer exterior side.
 * When partially overlapping, the overlapping edge is trimmed to the nearest izero boundary.
 *
 * @param region - Sample region bounds and metadata (geometry fields may change).
 * @param izero - Izero reference band bounds.
 * @param minGap - Minimum allowed sample span after clamping.
 * @param sampleMin - Spatial axis minimum.
 * @param sampleMax - Spatial axis maximum.
 */
export function enforceSampleRegionOutsideIzero(
  region: StxmSampleRegion,
  izero: StxmIzeroBounds,
  minGap: number,
  sampleMin: number,
  sampleMax: number,
): StxmSampleRegion {
  let sampleLo = Math.min(region.sampleLo, region.sampleHi);
  let sampleHi = Math.max(region.sampleLo, region.sampleHi);
  sampleLo = Math.max(sampleMin, Math.min(sampleLo, sampleMax - minGap));
  sampleHi = Math.min(sampleMax, Math.max(sampleHi, sampleLo + minGap));

  if (!sampleRangeOverlapsIzeroInterior(sampleLo, sampleHi, izero)) {
    return { ...region, sampleLo, sampleHi };
  }

  const izeroSpan = izero.izeroHi - izero.izeroLo;
  const regionSpan = sampleHi - sampleLo;

  if (regionSpan >= izeroSpan && sampleLo <= izero.izeroLo && sampleHi >= izero.izeroHi) {
    const spaceBelow = izero.izeroLo - sampleMin;
    const spaceAbove = sampleMax - izero.izeroHi;
    if (spaceBelow >= spaceAbove && spaceBelow >= minGap) {
      sampleHi = izero.izeroLo;
      sampleLo = Math.max(sampleMin, sampleHi - regionSpan);
    } else if (spaceAbove >= minGap) {
      sampleLo = izero.izeroHi;
      sampleHi = Math.min(sampleMax, sampleLo + regionSpan);
    } else if (spaceBelow >= minGap) {
      sampleHi = izero.izeroLo;
      sampleLo = Math.max(sampleMin, sampleHi - regionSpan);
    }
  } else if (sampleHi > izero.izeroLo && sampleLo < izero.izeroLo) {
    sampleHi = Math.max(sampleLo + minGap, izero.izeroLo);
  } else if (sampleLo < izero.izeroHi && sampleHi > izero.izeroHi) {
    sampleLo = Math.min(sampleHi - minGap, izero.izeroHi);
  } else {
    const distLo = Math.abs((sampleLo + sampleHi) / 2 - izero.izeroLo);
    const distHi = Math.abs((sampleLo + sampleHi) / 2 - izero.izeroHi);
    if (distLo <= distHi) {
      sampleHi = izero.izeroLo;
      sampleLo = Math.max(sampleMin, sampleHi - minGap);
    } else {
      sampleLo = izero.izeroHi;
      sampleHi = Math.min(sampleMax, sampleLo + minGap);
    }
  }

  sampleLo = Math.max(sampleMin, Math.min(sampleLo, sampleMax - minGap));
  sampleHi = Math.min(sampleMax, Math.max(sampleHi, sampleLo + minGap));

  if (sampleRangeOverlapsIzeroInterior(sampleLo, sampleHi, izero)) {
    sampleLo = clampSampleEdgeOutsideIzeroInterior(sampleLo, izero);
    sampleHi = clampSampleEdgeOutsideIzeroInterior(sampleHi, izero);
    if (sampleHi - sampleLo < minGap) {
      if (sampleLo <= izero.izeroLo) {
        sampleHi = Math.min(sampleMax, sampleLo + minGap);
      } else {
        sampleLo = Math.max(sampleMin, sampleHi - minGap);
      }
    }
  }

  return { ...region, sampleLo, sampleHi };
}

/**
 * Applies izero exclusivity to every sample region after izero or sample bounds change.
 *
 * @param regions - Current sample regions (order preserved).
 * @param izero - Izero reference band bounds.
 * @param minGap - Minimum allowed width per sample region.
 * @param sampleMin - Spatial axis minimum.
 * @param sampleMax - Spatial axis maximum.
 */
export function enforceAllSampleRegionsOutsideIzero(
  regions: StxmSampleRegion[],
  izero: StxmIzeroBounds,
  minGap: number,
  sampleMin: number,
  sampleMax: number,
): StxmSampleRegion[] {
  return regions.map((region) =>
    enforceSampleRegionOutsideIzero(region, izero, minGap, sampleMin, sampleMax),
  );
}

/**
 * Clamps a dragged sample edge against axis limits and izero exclusivity.
 *
 * @param edgeValue - Raw pointer sample coordinate.
 * @param oppositeEdge - Fixed opposite edge of the same region.
 * @param edge - Which edge is being dragged.
 * @param izero - Izero reference band bounds.
 * @param minGap - Minimum region width.
 * @param sampleMin - Spatial axis minimum.
 * @param sampleMax - Spatial axis maximum.
 */
export function clampDraggedSampleEdgeOutsideIzero(
  edgeValue: number,
  oppositeEdge: number,
  edge: "lo" | "hi",
  izero: StxmIzeroBounds,
  minGap: number,
  sampleMin: number,
  sampleMax: number,
): number {
  const clamped =
    edge === "lo"
      ? Math.min(Math.max(edgeValue, sampleMin), oppositeEdge - minGap)
      : Math.max(Math.min(edgeValue, sampleMax), oppositeEdge + minGap);

  const edgeOutsideIzero = clampSampleEdgeOutsideIzeroInterior(clamped, izero);
  if (edgeOutsideIzero === clamped) {
    return clamped;
  }

  const draftLo = edge === "lo" ? edgeOutsideIzero : oppositeEdge;
  const draftHi = edge === "hi" ? edgeOutsideIzero : oppositeEdge;
  if (!sampleRangeOverlapsIzeroInterior(draftLo, draftHi, izero)) {
    return edgeOutsideIzero;
  }

  return edge === "lo"
    ? Math.min(edgeOutsideIzero, izero.izeroLo - minGap)
    : Math.max(edgeOutsideIzero, izero.izeroHi + minGap);
}
