/** Planck constant times c in eV·cm (Henke / stxm convention). */
export const HC_EV_CM = 1.2398e-4;

/**
 * Returns a boolean mask selecting energies within `[lo, hi]` inclusive.
 */
export function energyRegionMask(
  energyEv: Float64Array,
  lo: number,
  hi: number,
): boolean[] {
  return Array.from(energyEv, (energy) => energy >= lo && energy <= hi);
}

/**
 * Subtracts the mean OD in the pre-edge window so the pre-edge baseline is near zero.
 */
export function preEdgeSubtract(
  energyEv: Float64Array,
  od: Float64Array,
  preLo: number,
  preHi: number,
): Float64Array {
  const mask = energyRegionMask(energyEv, preLo, preHi);
  let sum = 0;
  let count = 0;
  for (let i = 0; i < od.length; i += 1) {
    if (!mask[i]) {
      continue;
    }
    const value = od[i] ?? Number.NaN;
    if (Number.isFinite(value)) {
      sum += value;
      count += 1;
    }
  }
  const out = Float64Array.from(od);
  if (count === 0) {
    return out;
  }
  const baseline = sum / count;
  for (let i = 0; i < out.length; i += 1) {
    if (Number.isFinite(out[i])) {
      out[i] = (out[i] ?? 0) - baseline;
    }
  }
  return out;
}

/**
 * Scales OD so the mean in the post-edge window equals `target`.
 *
 * @returns Scaled OD and the multiplicative scale factor applied.
 */
export function postEdgeNormalize(
  energyEv: Float64Array,
  od: Float64Array,
  postLo: number,
  postHi: number,
  target = 1,
): { od: Float64Array; scale: number } {
  const mask = energyRegionMask(energyEv, postLo, postHi);
  let sum = 0;
  let count = 0;
  for (let i = 0; i < od.length; i += 1) {
    if (!mask[i]) {
      continue;
    }
    const value = od[i] ?? Number.NaN;
    if (Number.isFinite(value)) {
      sum += value;
      count += 1;
    }
  }
  const out = Float64Array.from(od);
  if (count === 0) {
    return { od: out, scale: 1 };
  }
  const meanPost = sum / count;
  if (meanPost <= 0 || !Number.isFinite(meanPost)) {
    return { od: out, scale: 1 };
  }
  const scale = target / meanPost;
  for (let i = 0; i < out.length; i += 1) {
    if (Number.isFinite(out[i])) {
      out[i] = (out[i] ?? 0) * scale;
    }
  }
  return { od: out, scale };
}

export type StxmNormalizationWindows = {
  preLo: number;
  preHi: number;
  postLo: number;
  postHi: number;
};

export type StxmNormalizationMetadata = {
  postEdgeScale: number;
};

/**
 * Applies pre-edge subtraction then post-edge scaling (stxm `pre_edge_scale` mode).
 */
export function normalizeNexafsOd(
  energyEv: Float64Array,
  od: Float64Array,
  windows: StxmNormalizationWindows,
  postTarget = 1,
): { odNormalized: Float64Array; metadata: StxmNormalizationMetadata } {
  const baselineRemoved = preEdgeSubtract(
    energyEv,
    od,
    windows.preLo,
    windows.preHi,
  );
  const { od: scaled, scale } = postEdgeNormalize(
    energyEv,
    baselineRemoved,
    windows.postLo,
    windows.postHi,
    postTarget,
  );
  return { odNormalized: scaled, metadata: { postEdgeScale: scale } };
}

/**
 * Suggests pre/post normalization windows from the scan energy span (stable plateau heuristics).
 */
export function suggestNormalizationWindows(
  energyEv: Float64Array,
): StxmNormalizationWindows {
  if (energyEv.length === 0) {
    return { preLo: 0, preHi: 0, postLo: 0, postHi: 0 };
  }
  const eMin = energyEv[0] ?? 0;
  const eMax = energyEv[energyEv.length - 1] ?? eMin;
  const span = Math.max(eMax - eMin, 1e-6);
  return {
    preLo: eMin,
    preHi: eMin + span * 0.08,
    postLo: eMax - span * 0.12,
    postHi: eMax,
  };
}
