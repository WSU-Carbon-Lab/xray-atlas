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

function kMeans1D(
  data: number[],
  k: number,
  randomState: number,
  maxIter = 100,
): number[] {
  const n = data.length;
  if (n === 0) {
    return [];
  }
  const sorted = [...data].sort((a, b) => a - b);
  const centroids: number[] = [];
  for (let i = 0; i < k; i += 1) {
    const idx = Math.min(n - 1, Math.floor(((i + 0.5) * n) / k));
    centroids.push(sorted[idx] ?? sorted[0] ?? 0);
  }
  const labels = new Array<number>(n).fill(0);
  let seed = randomState;
  const rand = (): number => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 0x1_0000_0000;
  };
  for (let iter = 0; iter < maxIter; iter += 1) {
    let changed = false;
    for (let i = 0; i < n; i += 1) {
      let best = 0;
      let bestDist = Infinity;
      for (let c = 0; c < k; c += 1) {
        const dist = Math.abs((data[i] ?? 0) - (centroids[c] ?? 0));
        if (dist < bestDist) {
          bestDist = dist;
          best = c;
        }
      }
      if (labels[i] !== best) {
        labels[i] = best;
        changed = true;
      }
    }
    const newCentroids = new Array<number>(k).fill(0);
    const counts = new Array<number>(k).fill(0);
    for (let i = 0; i < n; i += 1) {
      const label = labels[i] ?? 0;
      newCentroids[label] = (newCentroids[label] ?? 0) + (data[i] ?? 0);
      counts[label] = (counts[label] ?? 0) + 1;
    }
    for (let c = 0; c < k; c += 1) {
      if ((counts[c] ?? 0) > 0) {
        centroids[c] = (newCentroids[c] ?? 0) / (counts[c] ?? 1);
      } else {
        centroids[c] = sorted[Math.floor(rand() * n)] ?? 0;
      }
    }
    if (!changed) {
      break;
    }
  }
  return labels;
}

function segmentSpatialRegions(
  image: Float64Array[],
  nRegions = 3,
  profileColumns?: number,
  randomState = 0,
): { rowLabels: number[]; labelNames: string[] } {
  const nRows = image.length;
  const nCols = image[0]?.length ?? 0;
  const cols = profileColumns ?? Math.min(20, nCols);
  const profile: number[] = [];
  for (let row = 0; row < nRows; row += 1) {
    let sum = 0;
    for (let col = Math.max(0, nCols - cols); col < nCols; col += 1) {
      sum += image[row]?.[col] ?? 0;
    }
    profile.push(sum / cols);
  }
  const rowLabels = new Array<number>(nRows).fill(0);
  const raw = kMeans1D(profile, 3, randomState);
  const extents: number[] = [0, 0, 0];
  const meansIntensity: number[] = [0, 0, 0];
  const meanRow: number[] = [0, 0, 0];
  for (let idx = 0; idx < 3; idx += 1) {
    let count = 0;
    let intensitySum = 0;
    let rowSum = 0;
    for (let row = 0; row < nRows; row += 1) {
      if ((raw[row] ?? 0) === idx) {
        count += 1;
        rowSum += row;
        for (let col = 0; col < nCols; col += 1) {
          intensitySum += image[row]?.[col] ?? 0;
        }
      }
    }
    extents[idx] = count;
    meansIntensity[idx] = count > 0 ? intensitySum / (count * nCols) : 0;
    meanRow[idx] = count > 0 ? rowSum / count : 0;
  }
  let edgeIdx = 0;
  for (let idx = 1; idx < 3; idx += 1) {
    if ((extents[idx] ?? 0) < (extents[edgeIdx] ?? 0)) {
      edgeIdx = idx;
    }
  }
  const other = [0, 1, 2].filter((i) => i !== edgeIdx);
  const leftIdx =
    (meanRow[other[0] ?? 0] ?? 0) < (meanRow[other[1] ?? 0] ?? 0)
      ? other[0]!
      : other[1]!;
  const rightIdx = leftIdx === other[0] ? other[1]! : other[0]!;
  const sampleIdx =
    (meansIntensity[leftIdx] ?? 0) < (meansIntensity[rightIdx] ?? 0)
      ? leftIdx
      : rightIdx;
  const izeroIdx = sampleIdx === leftIdx ? rightIdx : leftIdx;
  for (let row = 0; row < nRows; row += 1) {
    const label = raw[row] ?? 0;
    if (label === sampleIdx) {
      rowLabels[row] = 0;
    } else if (label === edgeIdx) {
      rowLabels[row] = 1;
    } else if (label === izeroIdx) {
      rowLabels[row] = 2;
    }
  }
  const labelNames = ["sample", "edge", "izero"];
  if (nRegions > 3) {
    return { rowLabels, labelNames };
  }
  return { rowLabels, labelNames };
}

/**
 * Sets sample and izero bar bounds from three-region segmentation (sample, edge, izero).
 * Izero rows are the higher-mean-intensity cluster; sample rows are the lower-intensity cluster.
 */
export function barBoundsFromThreeRegions(
  image: Float64Array[],
  spatialAxis: Float64Array,
  profileColumns?: number,
  randomState = 0,
): [number, number, number, number] {
  const nRows = image.length;
  if (nRows < 3 || spatialAxis.length !== nRows) {
    const yMin = Math.min(...spatialAxis);
    const yMax = Math.max(...spatialAxis);
    const span = yMax - yMin;
    const margin = span * 0.05;
    return [yMin + span * 0.45, yMax - margin, yMin + margin, yMin + span * 0.35];
  }
  const { rowLabels } = segmentSpatialRegions(
    image,
    3,
    profileColumns,
    randomState,
  );
  const sampleRows: number[] = [];
  const izeroRows: number[] = [];
  for (let row = 0; row < nRows; row += 1) {
    if (rowLabels[row] === 0) {
      sampleRows.push(row);
    } else if (rowLabels[row] === 2) {
      izeroRows.push(row);
    }
  }
  if (sampleRows.length === 0 || izeroRows.length === 0) {
    return autoSampleIzeroRegions(image, spatialAxis);
  }
  const qSample = sampleRows.map((row) => spatialAxis[row] ?? 0);
  const qIzero = izeroRows.map((row) => spatialAxis[row] ?? 0);
  let barSampleLo = Math.min(...qSample);
  let barSampleHi = Math.max(...qSample);
  let barIzeroLo = Math.min(...qIzero);
  let barIzeroHi = Math.max(...qIzero);
  const span = Math.max(...spatialAxis) - Math.min(...spatialAxis);
  const margin = Math.max(span * 0.01, 1e-9);
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

  const izeroOnLeft = leftMean > rightMean;
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
