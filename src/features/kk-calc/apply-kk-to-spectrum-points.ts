import type { SpectrumPoint } from "~/components/plots/types";
import { computeDeltaFromBetaDiscreteKK } from "./kk-discrete-henke";

function geometryGroupKey(p: SpectrumPoint): string {
  const theta = p.theta;
  const phi = p.phi;
  if (
    typeof theta === "number" &&
    Number.isFinite(theta) &&
    typeof phi === "number" &&
    Number.isFinite(phi)
  ) {
    return `${theta.toFixed(6)}:${phi.toFixed(6)}`;
  }
  return "__none__";
}

/**
 * Augments upload-ready spectrum rows with `delta` computed from `beta` using
 * {@link computeDeltaFromBetaDiscreteKK} independently for each theta–phi group.
 *
 * @param points Spectrum rows that already include finite `beta` wherever KK should run;
 *   rows missing theta and phi are grouped together.
 * @returns A shallow-copied array with `delta` set on every index that participated in a
 *   successful group transform.
 * @throws RangeError When any geometry group contains a non-finite `beta` value.
 */
export function applyKkDeltaToSpectrumPoints(
  points: readonly SpectrumPoint[],
): SpectrumPoint[] {
  if (points.length === 0) return [];

  const byKey = new Map<string, number[]>();
  for (let idx = 0; idx < points.length; idx++) {
    const key = geometryGroupKey(points[idx]!);
    const arr = byKey.get(key);
    if (arr) {
      arr.push(idx);
    } else {
      byKey.set(key, [idx]);
    }
  }

  const out = points.map((p) => ({ ...p }));

  for (const indices of byKey.values()) {
    const sortedIdx = [...indices].sort(
      (a, b) => points[a]!.energy - points[b]!.energy,
    );
    const E = sortedIdx.map((i) => points[i]!.energy);
    const B = sortedIdx.map((i) => {
      const b = points[i]!.beta;
      return typeof b === "number" && Number.isFinite(b) ? b : Number.NaN;
    });
    if (!B.every((b) => Number.isFinite(b))) {
      throw new RangeError(
        "Kramers-Kronig requires finite beta on every point in each geometry group",
      );
    }
    const deltaArr = computeDeltaFromBetaDiscreteKK(E, B);
    for (let k = 0; k < sortedIdx.length; k++) {
      const globalIdx = sortedIdx[k]!;
      const d = deltaArr[k];
      if (Number.isFinite(d)) {
        out[globalIdx] = { ...out[globalIdx]!, delta: d };
      }
    }
  }

  return out;
}
