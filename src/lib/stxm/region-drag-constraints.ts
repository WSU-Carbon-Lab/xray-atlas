import type { StxmIzeroBounds, StxmSampleRegion } from "./stxm-region-types";
import {
  enforceAllSampleRegionsOutsideIzero,
  enforceSampleRegionOutsideIzero,
  sampleRangeOverlapsIzeroInterior,
} from "./region-izero-constraints";

export type SampleRegionBoundaryDrag = {
  regionIndex: number;
  edge: "lo" | "hi";
};

export type IzeroBoundaryDrag = {
  edge: "lo" | "hi";
};

export type RegionBoundaryDragResult = {
  regions: StxmSampleRegion[];
  izero: StxmIzeroBounds;
  clampedToIzero: boolean;
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function enforceMinGap(values: number[], minGap: number, pinnedIndex: number): number[] {
  const next = [...values];
  for (let index = pinnedIndex + 1; index < next.length; index += 1) {
    next[index] = Math.max(next[index]!, next[index - 1]! + minGap);
  }
  for (let index = pinnedIndex - 1; index >= 0; index -= 1) {
    next[index] = Math.min(next[index]!, next[index + 1]! - minGap);
  }
  return next;
}

/**
 * Applies a sample-region boundary drag with sortable boundary reordering.
 * Region identity is preserved; spatial order may swap when boundaries cross neighbors.
 * Izero exclusivity is enforced after reassignment.
 */
export function applySampleRegionBoundaryDrag(
  regions: StxmSampleRegion[],
  izero: StxmIzeroBounds,
  drag: SampleRegionBoundaryDrag,
  targetSample: number,
  sampleMin: number,
  sampleMax: number,
  minGap: number,
): RegionBoundaryDragResult {
  if (regions.length === 0) {
    return { regions, izero, clampedToIzero: false };
  }
  const dragRegion = regions[drag.regionIndex];
  if (!dragRegion) {
    return { regions, izero, clampedToIzero: false };
  }

  const ordered = [...regions].sort(
    (left, right) => left.sampleLo - right.sampleLo || left.sampleHi - right.sampleHi,
  );
  const orderIndex = ordered.findIndex((region) => region.id === dragRegion.id);
  if (orderIndex < 0) {
    return { regions, izero, clampedToIzero: false };
  }

  const values = ordered.flatMap((region) => [region.sampleLo, region.sampleHi]);
  const dragValueIndex = orderIndex * 2 + (drag.edge === "lo" ? 0 : 1);
  const clampedTarget = clamp(targetSample, sampleMin, sampleMax);
  values[dragValueIndex] = clampedTarget;

  const sorted = [...values].sort((left, right) => left - right);
  const pinnedIndex = sorted.indexOf(clampedTarget);
  let spaced = enforceMinGap(sorted, minGap, pinnedIndex >= 0 ? pinnedIndex : dragValueIndex);
  spaced[0] = Math.max(spaced[0]!, sampleMin);
  spaced[spaced.length - 1] = Math.min(spaced[spaced.length - 1]!, sampleMax);
  spaced = enforceMinGap(spaced, minGap, pinnedIndex >= 0 ? pinnedIndex : dragValueIndex);

  let clampedToIzero = false;
  const nextOrdered = ordered.map((region, index) => {
    const beforeLo = region.sampleLo;
    const beforeHi = region.sampleHi;
    const sampleLo = spaced[index * 2] ?? beforeLo;
    const sampleHi = spaced[index * 2 + 1] ?? beforeHi;
    const enforced = enforceSampleRegionOutsideIzero(
      { ...region, sampleLo, sampleHi },
      izero,
      minGap,
      sampleMin,
      sampleMax,
    );
    if (
      sampleRangeOverlapsIzeroInterior(beforeLo, beforeHi, izero) !==
        sampleRangeOverlapsIzeroInterior(
          enforced.sampleLo,
          enforced.sampleHi,
          izero,
        ) ||
      enforced.sampleLo !== sampleLo ||
      enforced.sampleHi !== sampleHi
    ) {
      clampedToIzero = true;
    }
    return enforced;
  });

  const nextById = new Map(nextOrdered.map((region) => [region.id, region]));
  return {
    regions: regions.map((region) => nextById.get(region.id) ?? region),
    izero,
    clampedToIzero,
  };
}

/**
 * Applies an izero boundary drag while preserving minimum band width.
 */
export function applyIzeroBoundaryDrag(
  izero: StxmIzeroBounds,
  drag: IzeroBoundaryDrag,
  targetSample: number,
  sampleMin: number,
  sampleMax: number,
  minGap: number,
): StxmIzeroBounds {
  if (drag.edge === "lo") {
    return {
      ...izero,
      izeroLo: clamp(targetSample, sampleMin, izero.izeroHi - minGap),
    };
  }
  return {
    ...izero,
    izeroHi: clamp(targetSample, izero.izeroLo + minGap, sampleMax),
  };
}

/**
 * After an izero resize, pushes sample regions that overlap the izero interior outward.
 */
export function resolveSampleRegionsAfterIzeroChange(
  regions: StxmSampleRegion[],
  izero: StxmIzeroBounds,
  sampleMin: number,
  sampleMax: number,
  minGap: number,
): { regions: StxmSampleRegion[]; clampedToIzero: boolean } {
  const next = enforceAllSampleRegionsOutsideIzero(
    regions,
    izero,
    minGap,
    sampleMin,
    sampleMax,
  );
  const clampedToIzero = next.some((region, index) => {
    const prior = regions[index];
    if (!prior) {
      return false;
    }
    return (
      prior.sampleLo !== region.sampleLo ||
      prior.sampleHi !== region.sampleHi
    );
  });
  return { regions: next, clampedToIzero };
}
