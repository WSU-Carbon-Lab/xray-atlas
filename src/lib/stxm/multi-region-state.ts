import { autoMultiRegionFromProfile, segmentedRegionBoundsFromImage } from "./regions";
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
 * Auto-suggests izero bounds and sample (film) regions from row-sum intensity segmentation.
 *
 * Picks the brightest stripe cluster as izero, splits lower-intensity sample rows into up to
 * `maxSampleRegions` bands when the profile supports it, and marks the lowest-intensity band pure.
 *
 * @param image - Oriented scan `(nSpatial, nEnergy)`.
 * @param spatial - Spatial axis aligned with rows.
 * @param maxSampleRegions - Maximum sample/film regions to propose.
 */
export function autoMultiRegionFromImage(
  image: Float64Array[],
  spatial: Float64Array,
  maxSampleRegions = 3,
): {
  regions: StxmSampleRegion[];
  izero: StxmIzeroBounds;
  pureRegionId: string;
} {
  const profileResult = autoMultiRegionFromProfile(image, spatial);
  const sampleBounds =
    profileResult.sampleRegions.length > 0
      ? profileResult.sampleRegions.slice(0, maxSampleRegions)
      : segmentedRegionBoundsFromImage(image, spatial, maxSampleRegions).sampleBounds;

  const rowProfile = image.map((row) => row[row.length - 1] ?? 0);
  let pureIndex = 0;
  let lowestMean = Infinity;
  sampleBounds.forEach((bounds, index) => {
    let sum = 0;
    let count = 0;
    for (let rowIndex = 0; rowIndex < spatial.length; rowIndex += 1) {
      const value = spatial[rowIndex] ?? 0;
      if (value >= bounds.sampleLo && value <= bounds.sampleHi) {
        sum += rowProfile[rowIndex] ?? 0;
        count += 1;
      }
    }
    const mean = count > 0 ? sum / count : Infinity;
    if (mean < lowestMean) {
      lowestMean = mean;
      pureIndex = index;
    }
  });

  const regions = sampleBounds.map((bounds, index) => {
    const id = newRegionId();
    const isPure = index === pureIndex;
    return {
      id,
      sampleLo: bounds.sampleLo,
      sampleHi: bounds.sampleHi,
      spotLabel: isPure ? "pure" : index === 0 ? "film" : `film${index}`,
      role: isPure ? ("pure" as const) : ("custom" as const),
    };
  });

  const pureRegionId = regions[pureIndex]?.id ?? regions[0]?.id ?? newRegionId();
  return {
    regions:
      regions.length > 0
        ? regions
        : [
            {
              id: pureRegionId,
              sampleLo: spatial[0] ?? 0,
              sampleHi: spatial.at(-1) ?? 1,
              spotLabel: "pure",
              role: "pure" as const,
            },
          ],
    izero: {
      izeroLo: profileResult.izeroLo,
      izeroHi: profileResult.izeroHi,
    },
    pureRegionId,
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
