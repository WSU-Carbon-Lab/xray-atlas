/**
 * Builds boolean sample and izero masks from spatial axis bounds (inclusive).
 *
 * @param spatialAxis - Spatial coordinate per row.
 * @param sampleLo - Sample region lower bound.
 * @param sampleHi - Sample region upper bound.
 * @param izeroLo - Izero region lower bound.
 * @param izeroHi - Izero region upper bound.
 */
export function sampleIzeroMasks(
  spatialAxis: Float64Array,
  sampleLo: number,
  sampleHi: number,
  izeroLo: number,
  izeroHi: number,
): { sampleMask: boolean[]; izeroMask: boolean[] } {
  const sampleMask: boolean[] = [];
  const izeroMask: boolean[] = [];
  for (const value of spatialAxis) {
    sampleMask.push(value >= sampleLo && value <= sampleHi);
    izeroMask.push(value >= izeroLo && value <= izeroHi);
  }
  return { sampleMask, izeroMask };
}

function movingAverage(values: Float64Array, window: number): Float64Array {
  const out = new Float64Array(values.length);
  const half = Math.floor(window / 2);
  for (let i = 0; i < values.length; i += 1) {
    let sum = 0;
    let count = 0;
    for (let j = Math.max(0, i - half); j <= Math.min(values.length - 1, i + half); j += 1) {
      sum += values[j] ?? 0;
      count += 1;
    }
    out[i] = sum / count;
  }
  return out;
}

/**
 * Infers sample and izero bar positions from the trailing-energy column profile.
 *
 * @param image - Oriented scan `(nSpatial, nEnergy)`.
 * @param spatialAxis - Spatial coordinates aligned with rows.
 * @returns Four bounds: sampleLo, sampleHi, izeroLo, izeroHi.
 */
export function autoSampleIzeroRegions(
  image: Float64Array[],
  spatialAxis: Float64Array,
): [number, number, number, number] {
  const n = image.length;
  if (n < 4 || spatialAxis.length !== n) {
    const yMin = Math.min(...spatialAxis);
    const yMax = Math.max(...spatialAxis);
    const span = yMax - yMin;
    const margin = span * 0.05;
    return [yMin + span * 0.45, yMax - margin, yMin + margin, yMin + span * 0.35];
  }

  const profileRaw = new Float64Array(n);
  for (let row = 0; row < n; row += 1) {
    const rowValues = image[row] ?? [];
    profileRaw[row] = rowValues[rowValues.length - 1] ?? 0;
  }
  const profile = movingAverage(profileRaw, 5);

  let cliffIdx = 0;
  let maxGrad = 0;
  for (let i = 0; i < n - 1; i += 1) {
    const grad = Math.abs((profile[i + 1] ?? 0) - (profile[i] ?? 0));
    if (grad > maxGrad) {
      maxGrad = grad;
      cliffIdx = i;
    }
  }
  cliffIdx = Math.min(Math.max(cliffIdx, 0), n - 2);

  const leftMean =
    ((profile[Math.max(0, cliffIdx - 2)] ?? 0) +
      (profile[Math.max(0, cliffIdx - 1)] ?? 0) +
      (profile[cliffIdx] ?? 0)) /
    3;
  const rightMean =
    ((profile[cliffIdx + 1] ?? 0) +
      (profile[Math.min(n - 1, cliffIdx + 2)] ?? 0) +
      (profile[Math.min(n - 1, cliffIdx + 3)] ?? 0)) /
    3;

  const izeroOnLeft = leftMean < rightMean;
  const bufferPixels = Math.max(1, Math.floor(n * 0.05));
  const minRegionPixels = Math.max(2, Math.floor(n * 0.08));
  const mid = Math.floor(n / 2);

  let barSampleLo: number;
  let barSampleHi: number;
  let barIzeroLo: number;
  let barIzeroHi: number;

  if (izeroOnLeft) {
    const izeroEnd = Math.min(Math.max(cliffIdx - bufferPixels, minRegionPixels - 1), n - 2);
    const sampleStart = Math.min(Math.max(cliffIdx + 1 + bufferPixels, 1), n - minRegionPixels);
    if (izeroEnd < sampleStart) {
      barIzeroLo = spatialAxis[0] ?? 0;
      barIzeroHi = spatialAxis[izeroEnd] ?? 0;
      barSampleLo = spatialAxis[sampleStart] ?? 0;
      barSampleHi = spatialAxis[n - 1] ?? 0;
    } else {
      barSampleLo = spatialAxis[0] ?? 0;
      barSampleHi = spatialAxis[Math.max(0, mid - minRegionPixels)] ?? 0;
      barIzeroLo = spatialAxis[Math.min(n - 1, mid + minRegionPixels)] ?? 0;
      barIzeroHi = spatialAxis[n - 1] ?? 0;
    }
  } else {
    const sampleEnd = Math.min(Math.max(cliffIdx - bufferPixels, minRegionPixels - 1), n - 2);
    const izeroStart = Math.min(Math.max(cliffIdx + 1 + bufferPixels, 1), n - minRegionPixels);
    if (sampleEnd < izeroStart) {
      barSampleLo = spatialAxis[0] ?? 0;
      barSampleHi = spatialAxis[sampleEnd] ?? 0;
      barIzeroLo = spatialAxis[izeroStart] ?? 0;
      barIzeroHi = spatialAxis[n - 1] ?? 0;
    } else {
      barIzeroLo = spatialAxis[0] ?? 0;
      barIzeroHi = spatialAxis[Math.max(0, mid - minRegionPixels)] ?? 0;
      barSampleLo = spatialAxis[Math.min(n - 1, mid + minRegionPixels)] ?? 0;
      barSampleHi = spatialAxis[n - 1] ?? 0;
    }
  }

  const span = (spatialAxis[n - 1] ?? 0) - (spatialAxis[0] ?? 0);
  const margin = span * 0.02;
  if (Math.abs(barSampleHi - barSampleLo) < margin) {
    const lo = Math.min(barSampleLo, barSampleHi);
    const hi = Math.max(barSampleLo, barSampleHi);
    barSampleLo = lo - margin;
    barSampleHi = hi + margin;
  }
  if (Math.abs(barIzeroHi - barIzeroLo) < margin) {
    const lo = Math.min(barIzeroLo, barIzeroHi);
    const hi = Math.max(barIzeroLo, barIzeroHi);
    barIzeroLo = lo - margin;
    barIzeroHi = hi + margin;
  }

  return [barSampleLo, barSampleHi, barIzeroLo, barIzeroHi];
}
