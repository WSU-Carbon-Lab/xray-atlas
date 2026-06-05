import type { StxmIzeroBounds, StxmSampleRegion } from "./stxm-region-types";

export type RegionGap = {
  lo: number;
  hi: number;
};

export type RegionDragTarget =
  | { kind: "izero" }
  | { kind: "region"; index: number };

export type RegionDragState =
  | { kind: "izero-lo" }
  | { kind: "izero-hi" }
  | { kind: "region"; index: number; edge: "lo" | "hi" }
  | null;

export function clampRegionValue(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function regionDisplayLabel(region: StxmSampleRegion, index: number): string {
  const label = region.spotLabel.trim();
  return label.length > 0 ? label : `Region ${index + 1}`;
}

export function findRegionDragTarget(
  sample: number,
  hitMargin: number,
  izero: StxmIzeroBounds,
  regions: StxmSampleRegion[],
): NonNullable<RegionDragState> | null {
  const candidates: Array<{ distance: number; drag: NonNullable<RegionDragState> }> = [
    { distance: Math.abs(sample - izero.izeroLo), drag: { kind: "izero-lo" } },
    { distance: Math.abs(sample - izero.izeroHi), drag: { kind: "izero-hi" } },
  ];
  regions.forEach((region, index) => {
    candidates.push(
      {
        distance: Math.abs(sample - region.sampleLo),
        drag: { kind: "region", index, edge: "lo" },
      },
      {
        distance: Math.abs(sample - region.sampleHi),
        drag: { kind: "region", index, edge: "hi" },
      },
    );
  });
  candidates.sort((left, right) => left.distance - right.distance);
  const nearest = candidates[0];
  if (nearest && nearest.distance <= hitMargin) {
    return nearest.drag;
  }
  return null;
}

export function computeRegionGaps(
  regions: StxmSampleRegion[],
  izero: StxmIzeroBounds,
  sampleMin: number,
  sampleMax: number,
  minGap: number,
): RegionGap[] {
  const boundaries = new Set<number>([
    sampleMin,
    sampleMax,
    izero.izeroLo,
    izero.izeroHi,
    ...regions.flatMap((region) => [region.sampleLo, region.sampleHi]),
  ]);
  const sorted = [...boundaries].sort((left, right) => left - right);
  const gaps: RegionGap[] = [];
  for (let index = 0; index < sorted.length - 1; index += 1) {
    const lo = sorted[index]!;
    const hi = sorted[index + 1]!;
    if (hi - lo < minGap) {
      continue;
    }
    const mid = (lo + hi) / 2;
    if (mid >= izero.izeroLo && mid <= izero.izeroHi) {
      continue;
    }
    const insideRegion = regions.some(
      (region) => mid > region.sampleLo && mid < region.sampleHi,
    );
    if (insideRegion) {
      continue;
    }
    gaps.push({ lo, hi });
  }
  return gaps;
}

/**
 * Resolves which sample region supplies Beer-Lambert transmission (pure/sample role).
 */
export function resolvePureRegionIndex(
  regions: StxmSampleRegion[],
  explicitPureId?: string | null,
): number {
  if (explicitPureId) {
    const index = regions.findIndex((region) => region.id === explicitPureId);
    if (index >= 0) {
      return index;
    }
  }
  const pureByRole = regions.findIndex((region) => region.role === "pure");
  if (pureByRole >= 0) {
    return pureByRole;
  }
  const pureByLabel = regions.findIndex((region) => {
    const label = region.spotLabel.trim().toLowerCase();
    return label === "pure" || label === "sample" || label === "transmission";
  });
  if (pureByLabel >= 0) {
    return pureByLabel;
  }
  return 0;
}

/**
 * Assigns pure role to one region and custom role to siblings.
 */
export function setPureRegionRole(
  regions: StxmSampleRegion[],
  pureRegionId: string,
): StxmSampleRegion[] {
  return regions.map((region) => ({
    ...region,
    role: region.id === pureRegionId ? "pure" : region.role === "pure" ? "custom" : region.role,
  }));
}
