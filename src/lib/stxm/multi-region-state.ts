import { barBoundsFromThreeRegions } from "./regions";
import type { StxmIzeroBounds, StxmSampleRegion } from "./stxm-region-types";
import type { StxmRegionBounds } from "~/lib/dashboard-processing-session";

function newRegionId(): string {
  return crypto.randomUUID();
}

/**
 * Builds default multi-region state from legacy two-bar bounds.
 */
export function legacyBoundsToMultiRegion(bounds: StxmRegionBounds): {
  regions: StxmSampleRegion[];
  izero: StxmIzeroBounds;
  pureRegionId: string;
} {
  const pureId = newRegionId();
  return {
    regions: [
      {
        id: pureId,
        sampleLo: bounds.sampleLo,
        sampleHi: bounds.sampleHi,
        spotLabel: "pure",
        role: "pure",
      },
    ],
    izero: {
      izeroLo: bounds.izeroLo,
      izeroHi: bounds.izeroHi,
    },
    pureRegionId: pureId,
  };
}

/**
 * Flattens multi-region state into legacy bounds for the reduction pipeline.
 */
export function multiRegionToLegacyBounds(
  regions: StxmSampleRegion[],
  izero: StxmIzeroBounds,
  pureRegionId?: string | null,
): StxmRegionBounds {
  const pureIndex = regions.findIndex(
    (region) => region.id === pureRegionId || region.role === "pure",
  );
  const pure = regions[pureIndex >= 0 ? pureIndex : 0];
  if (!pure) {
    return {
      sampleLo: 0,
      sampleHi: 1,
      izeroLo: izero.izeroLo,
      izeroHi: izero.izeroHi,
    };
  }
  return {
    sampleLo: pure.sampleLo,
    sampleHi: pure.sampleHi,
    izeroLo: izero.izeroLo,
    izeroHi: izero.izeroHi,
  };
}

/**
 * Auto-suggests izero bounds and a single pure sample region from image profile.
 */
export function autoMultiRegionFromImage(
  image: Float64Array[],
  spatial: Float64Array,
): {
  regions: StxmSampleRegion[];
  izero: StxmIzeroBounds;
  pureRegionId: string;
} {
  const [sampleLo, sampleHi, izeroLo, izeroHi] = barBoundsFromThreeRegions(
    image,
    spatial,
  );
  const pureId = newRegionId();
  return {
    regions: [
      {
        id: pureId,
        sampleLo,
        sampleHi,
        spotLabel: "pure",
        role: "pure",
      },
    ],
    izero: { izeroLo, izeroHi },
    pureRegionId: pureId,
  };
}

/**
 * Inserts a new sample region spanning a gap between existing boundaries.
 */
export function createRegionInGap(
  gapLo: number,
  gapHi: number,
  regions: StxmSampleRegion[],
): StxmSampleRegion {
  return {
    id: newRegionId(),
    sampleLo: gapLo,
    sampleHi: gapHi,
    spotLabel: `spot${regions.length + 1}`,
    role: "custom",
  };
}
