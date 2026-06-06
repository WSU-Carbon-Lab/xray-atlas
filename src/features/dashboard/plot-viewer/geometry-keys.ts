import type { SpectrumPoint } from "~/components/plots/types";
import { buildGeometryLabel } from "~/components/plots/utils/trace-utils";

/**
 * Stable geometry key for polarization grouping (`theta:phi` or `fixed`).
 */
export function geometryKeyFromPoint(point: SpectrumPoint): string {
  const hasGeometry =
    typeof point.theta === "number" &&
    Number.isFinite(point.theta) &&
    typeof point.phi === "number" &&
    Number.isFinite(point.phi);
  return hasGeometry ? `${point.theta}:${point.phi}` : "fixed";
}

/**
 * Keeps only points whose geometry key is in `keys`; when `keys` is empty, returns all points.
 */
export function filterPointsByGeometryKeys(
  points: readonly SpectrumPoint[],
  keys: readonly string[],
): SpectrumPoint[] {
  if (keys.length === 0) {
    return [...points];
  }
  const allowed = new Set(keys);
  return points.filter((point) => allowed.has(geometryKeyFromPoint(point)));
}

export type GeometryOption = {
  key: string;
  label: string;
};

/**
 * Collects unique geometry keys and human labels from spectrum points.
 */
export function collectGeometryOptions(
  points: readonly SpectrumPoint[],
): GeometryOption[] {
  const map = new Map<string, string>();
  for (const point of points) {
    const key = geometryKeyFromPoint(point);
    if (!map.has(key)) {
      map.set(key, buildGeometryLabel(point.theta, point.phi));
    }
  }
  return [...map.entries()]
    .map(([key, label]) => ({ key, label }))
    .sort((left, right) => left.key.localeCompare(right.key));
}
