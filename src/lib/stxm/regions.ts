/**
 * STXM line-scan spatial region inference and mask construction.
 *
 * Auto-suggest (`autoMultiRegionFromProfile`) uses a row-sum intensity profile from the
 * trailing-energy columns of the oriented scan:
 *
 * 1. **Izero** — smooth the profile, find contiguous high-intensity runs above a
 *    brightness threshold (75th percentile of row sums), and pick the run with the
 *    highest mean intensity and lowest relative variance (stable open-beam band).
 * 2. **Film / pure sample bands** — on rows outside the izero band, split at deep
 *    profile valleys (local minima below 85% of neighboring maxima) to separate
 *    multiple transmission regions; otherwise emit one contiguous sample band.
 *
 * Legacy helpers (`barBoundsFromThreeRegions`, `autoSampleIzeroRegions`) remain for
 * two-bar metadata and fallback when clustering fails.
 */

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

function trailingColumnProfile(
  image: Float64Array[],
  profileColumns?: number,
): number[] {
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
  return profile;
}

function segmentSpatialRegions(
  image: Float64Array[],
  nRegions = 3,
  profileColumns?: number,
  randomState = 0,
): { rowLabels: number[]; labelNames: string[] } {
  const nRows = image.length;
  const profile = trailingColumnProfile(image, profileColumns);
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
        intensitySum += profile[row] ?? 0;
      }
    }
    extents[idx] = count;
    meansIntensity[idx] = count > 0 ? intensitySum / count : 0;
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
    const nSampleParts = nRegions - 2;
    const sampleRows: number[] = [];
    for (let row = 0; row < nRows; row += 1) {
      if (rowLabels[row] === 0) {
        sampleRows.push(row);
      }
    }
    if (sampleRows.length >= nSampleParts * 2) {
      const sampleProfile = sampleRows.map((row) => profile[row] ?? 0);
      const sub = kMeans1D(sampleProfile, nSampleParts, randomState);
      const centroidOrder = [...sub]
        .reduce<Map<number, number>>((acc, label, index) => {
          const row = sampleRows[index] ?? 0;
          acc.set(label, (acc.get(label) ?? 0) + row);
          return acc;
        }, new Map())
        .entries();
      const sortedLabels = [...centroidOrder]
        .sort((left, right) => left[1] - right[1])
        .map(([label]) => label);
      const remap = new Map<number, number>();
      sortedLabels.forEach((label, order) => {
        remap.set(label, order);
      });
      for (let index = 0; index < sampleRows.length; index += 1) {
        const row = sampleRows[index]!;
        rowLabels[row] = remap.get(sub[index] ?? 0) ?? 0;
      }
      for (let row = 0; row < nRows; row += 1) {
        if (rowLabels[row] === 1) {
          rowLabels[row] = nRegions - 2;
        } else if (raw[row] === izeroIdx) {
          rowLabels[row] = nRegions - 1;
        }
      }
      return {
        rowLabels,
        labelNames: [
          ...Array.from({ length: nSampleParts }, (_, index) => `sample_${index + 1}`),
          "edge",
          "izero",
        ],
      };
    }
  }
  return { rowLabels, labelNames };
}

export type StxmSegmentedRegionBounds = {
  sampleBounds: Array<{ sampleLo: number; sampleHi: number }>;
  izeroLo: number;
  izeroHi: number;
};

/**
 * Segments a line scan into izero and one or more sample (film) bands using row-sum intensity.
 *
 * Izero rows are the brightest cluster; sample rows are lower-intensity clusters split by
 * profile valleys when enough sample rows exist. Returned sample bounds exclude izero interior.
 *
 * @param image - Oriented scan `(nSpatial, nEnergy)`.
 * @param spatialAxis - Spatial coordinates aligned with rows.
 * @param maxSampleRegions - Maximum film/sample regions to propose (including pure).
 * @param profileColumns - Trailing energy columns averaged for the row profile.
 * @param randomState - Deterministic seed for k-means initialization.
 */
export function segmentedRegionBoundsFromImage(
  image: Float64Array[],
  spatialAxis: Float64Array,
  maxSampleRegions = 3,
  profileColumns?: number,
  randomState = 0,
): StxmSegmentedRegionBounds {
  const nRows = image.length;
  if (nRows < 3 || spatialAxis.length !== nRows) {
    const [sampleLo, sampleHi, izeroLo, izeroHi] = autoSampleIzeroRegions(
      image,
      spatialAxis,
    );
    return {
      sampleBounds: [{ sampleLo, sampleHi }],
      izeroLo,
      izeroHi,
    };
  }

  const nRegions = Math.max(3, Math.min(maxSampleRegions + 2, 5));
  const { rowLabels, labelNames } = segmentSpatialRegions(
    image,
    nRegions,
    profileColumns,
    randomState,
  );
  const izeroLabel = Math.max(...rowLabels);
  const sampleLabelCount = labelNames.filter((name) => name.startsWith("sample")).length;
  const sampleRowsByLabel = new Map<number, number[]>();
  const izeroRows: number[] = [];
  for (let row = 0; row < nRows; row += 1) {
    const label = rowLabels[row] ?? 0;
    if (label === izeroLabel) {
      izeroRows.push(row);
      continue;
    }
    if (label >= sampleLabelCount) {
      continue;
    }
    const bucket = sampleRowsByLabel.get(label) ?? [];
    bucket.push(row);
    sampleRowsByLabel.set(label, bucket);
  }

  if (izeroRows.length === 0 || sampleRowsByLabel.size === 0) {
    const [sampleLo, sampleHi, izeroLo, izeroHi] = barBoundsFromThreeRegions(
      image,
      spatialAxis,
      profileColumns,
      randomState,
    );
    return {
      sampleBounds: [{ sampleLo, sampleHi }],
      izeroLo,
      izeroHi,
    };
  }

  const qIzero = izeroRows.map((row) => spatialAxis[row] ?? 0);
  let izeroLo = Math.min(...qIzero);
  let izeroHi = Math.max(...qIzero);
  const span = Math.max(...spatialAxis) - Math.min(...spatialAxis);
  const margin = Math.max(span * 0.01, 1e-9);
  if (Math.abs(izeroHi - izeroLo) < margin) {
    const lo = Math.min(izeroLo, izeroHi);
    const hi = Math.max(izeroLo, izeroHi);
    izeroLo = lo - margin;
    izeroHi = hi + margin;
  }

  const sampleBounds = [...sampleRowsByLabel.entries()]
    .sort(([left], [right]) => left - right)
    .map(([, rows]) => {
      const coords = rows.map((row) => spatialAxis[row] ?? 0);
      let sampleLo = Math.min(...coords);
      let sampleHi = Math.max(...coords);
      if (Math.abs(sampleHi - sampleLo) < margin) {
        const lo = Math.min(sampleLo, sampleHi);
        const hi = Math.max(sampleLo, sampleHi);
        sampleLo = lo - margin;
        sampleHi = hi + margin;
      }
      return { sampleLo, sampleHi };
    })
    .filter(
      (bounds) =>
        bounds.sampleHi <= izeroLo ||
        bounds.sampleLo >= izeroHi ||
        bounds.sampleHi - bounds.sampleLo > margin,
    );

  if (sampleBounds.length === 0) {
    const [sampleLo, sampleHi] = barBoundsFromThreeRegions(
      image,
      spatialAxis,
      profileColumns,
      randomState,
    ).slice(0, 2) as [number, number];
    return {
      sampleBounds: [{ sampleLo, sampleHi }],
      izeroLo,
      izeroHi,
    };
  }

  return { sampleBounds, izeroLo, izeroHi };
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

export type StxmProfileRegionSpan = {
  sampleLo: number;
  sampleHi: number;
};

export type StxmAutoMultiRegionResult = {
  izeroLo: number;
  izeroHi: number;
  sampleRegions: StxmProfileRegionSpan[];
};

/**
 * Builds a per-row intensity profile from trailing energy columns (row sums).
 */
export function buildLineScanRowSumProfile(
  image: Float64Array[],
  profileColumns?: number,
): Float64Array {
  const nRows = image.length;
  const nCols = image[0]?.length ?? 0;
  const cols = profileColumns ?? Math.min(20, nCols);
  const profile = new Float64Array(nRows);
  for (let row = 0; row < nRows; row += 1) {
    let sum = 0;
    for (let col = Math.max(0, nCols - cols); col < nCols; col += 1) {
      sum += image[row]?.[col] ?? 0;
    }
    profile[row] = sum / Math.max(cols, 1);
  }
  return profile;
}

type IntensityRun = {
  startRow: number;
  endRow: number;
  mean: number;
  stability: number;
};

function findContiguousRuns(mask: boolean[]): IntensityRun[] {
  const runs: IntensityRun[] = [];
  let start = -1;
  for (let row = 0; row <= mask.length; row += 1) {
    const active = row < mask.length && mask[row];
    if (active && start < 0) {
      start = row;
    } else if (!active && start >= 0) {
      runs.push({ startRow: start, endRow: row - 1, mean: 0, stability: 0 });
      start = -1;
    }
  }
  return runs;
}

function scoreRun(profile: Float64Array, run: IntensityRun): IntensityRun {
  let sum = 0;
  let sumSq = 0;
  let count = 0;
  for (let row = run.startRow; row <= run.endRow; row += 1) {
    const value = profile[row] ?? 0;
    sum += value;
    sumSq += value * value;
    count += 1;
  }
  const mean = count > 0 ? sum / count : 0;
  const variance = count > 0 ? Math.max(sumSq / count - mean * mean, 0) : 0;
  const stability = mean > 0 ? Math.sqrt(variance) / mean : Infinity;
  return { ...run, mean, stability };
}

/**
 * Detects the brightest stable contiguous band as izero row indices.
 */
export function detectIzeroRowsFromProfile(
  profile: Float64Array,
  minRunRows = 2,
): { startRow: number; endRow: number } | null {
  const nRows = profile.length;
  if (nRows < minRunRows) {
    return null;
  }
  const sorted = [...profile].sort((left, right) => left - right);
  const p75 = sorted[Math.floor(nRows * 0.75)] ?? sorted[nRows - 1] ?? 0;
  const threshold = Math.max(p75, (sorted[nRows - 1] ?? 0) * 0.85);
  const brightMask = Array.from(profile, (value) => value >= threshold);
  const runs = findContiguousRuns(brightMask)
    .filter((run) => run.endRow - run.startRow + 1 >= minRunRows)
    .map((run) => scoreRun(profile, run));
  if (runs.length === 0) {
    return null;
  }
  runs.sort((left, right) => {
    if (right.mean !== left.mean) {
      return right.mean - left.mean;
    }
    return left.stability - right.stability;
  });
  const best = runs[0]!;
  return { startRow: best.startRow, endRow: best.endRow };
}

function spatialBoundsForRows(
  spatialAxis: Float64Array,
  startRow: number,
  endRow: number,
): StxmProfileRegionSpan {
  const loRow = Math.min(startRow, endRow);
  const hiRow = Math.max(startRow, endRow);
  return {
    sampleLo: spatialAxis[loRow] ?? 0,
    sampleHi: spatialAxis[hiRow] ?? 0,
  };
}

function isRowInsideIzero(
  row: number,
  izeroStart: number,
  izeroEnd: number,
  bufferRows: number,
): boolean {
  return row >= izeroStart - bufferRows && row <= izeroEnd + bufferRows;
}

/**
 * Splits non-izero rows into sample/film bands at deep profile valleys.
 */
export function detectSampleRegionsFromProfile(
  profile: Float64Array,
  spatialAxis: Float64Array,
  izeroStartRow: number,
  izeroEndRow: number,
  minRegionRows = 2,
): StxmProfileRegionSpan[] {
  const nRows = profile.length;
  if (nRows === 0) {
    return [];
  }
  const bufferRows = Math.max(1, Math.floor(nRows * 0.02));
  const candidateRows: number[] = [];
  for (let row = 0; row < nRows; row += 1) {
    if (!isRowInsideIzero(row, izeroStartRow, izeroEndRow, bufferRows)) {
      candidateRows.push(row);
    }
  }
  if (candidateRows.length === 0) {
    return [];
  }
  if (candidateRows.length < minRegionRows * 2) {
    const startRow = candidateRows[0]!;
    const endRow = candidateRows[candidateRows.length - 1]!;
    return [spatialBoundsForRows(spatialAxis, startRow, endRow)];
  }

  const splitRows: number[] = [];
  for (let index = 1; index < candidateRows.length - 1; index += 1) {
    const row = candidateRows[index]!;
    const prev = profile[candidateRows[index - 1]!] ?? 0;
    const next = profile[candidateRows[index + 1]!] ?? 0;
    const value = profile[row] ?? 0;
    const neighborMax = Math.max(prev, next);
    if (
      value <= neighborMax * 0.85 &&
      value <= (profile[row - 1] ?? value) &&
      value <= (profile[row + 1] ?? value)
    ) {
      splitRows.push(row);
    }
  }

  const segments: StxmProfileRegionSpan[] = [];
  let segmentStart = candidateRows[0]!;
  for (const splitRow of splitRows) {
    const segmentEnd = splitRow - 1;
    if (segmentEnd - segmentStart + 1 >= minRegionRows) {
      segments.push(spatialBoundsForRows(spatialAxis, segmentStart, segmentEnd));
      segmentStart = splitRow;
    }
  }
  const lastRow = candidateRows[candidateRows.length - 1]!;
  if (lastRow - segmentStart + 1 >= minRegionRows) {
    segments.push(spatialBoundsForRows(spatialAxis, segmentStart, lastRow));
  }
  if (segments.length === 0) {
    return [spatialBoundsForRows(spatialAxis, candidateRows[0]!, lastRow)];
  }
  return segments;
}

function widenDegenerateSpan(
  lo: number,
  hi: number,
  margin: number,
): StxmProfileRegionSpan {
  if (Math.abs(hi - lo) >= margin) {
    return { sampleLo: lo, sampleHi: hi };
  }
  const center = (lo + hi) / 2;
  return { sampleLo: center - margin, sampleHi: center + margin };
}

/**
 * Infers izero bounds and one or more sample/film regions from a line-scan image.
 */
export function autoMultiRegionFromProfile(
  image: Float64Array[],
  spatialAxis: Float64Array,
  profileColumns?: number,
): StxmAutoMultiRegionResult {
  const nRows = image.length;
  if (nRows < 3 || spatialAxis.length !== nRows) {
    const [sampleLo, sampleHi, izeroLo, izeroHi] = autoSampleIzeroRegions(
      image,
      spatialAxis,
    );
    return {
      izeroLo,
      izeroHi,
      sampleRegions: [{ sampleLo, sampleHi }],
    };
  }

  const profile = buildLineScanRowSumProfile(image, profileColumns);
  const smoothed = movingAverage(profile, 5);
  const izeroRows = detectIzeroRowsFromProfile(smoothed);
  if (!izeroRows) {
    const [sampleLo, sampleHi, izeroLo, izeroHi] = barBoundsFromThreeRegions(
      image,
      spatialAxis,
      profileColumns,
    );
    return {
      izeroLo,
      izeroHi,
      sampleRegions: [{ sampleLo, sampleHi }],
    };
  }

  const izeroBounds = spatialBoundsForRows(
    spatialAxis,
    izeroRows.startRow,
    izeroRows.endRow,
  );
  const sampleRegions = detectSampleRegionsFromProfile(
    smoothed,
    spatialAxis,
    izeroRows.startRow,
    izeroRows.endRow,
  );
  const span = Math.max(...spatialAxis) - Math.min(...spatialAxis);
  const margin = Math.max(span * 0.01, 1e-9);
  const widenedIzero = widenDegenerateSpan(
    izeroBounds.sampleLo,
    izeroBounds.sampleHi,
    margin,
  );
  const widenedSamples =
    sampleRegions.length > 0
      ? sampleRegions.map((region) =>
          widenDegenerateSpan(region.sampleLo, region.sampleHi, margin),
        )
      : [
          widenDegenerateSpan(
            spatialAxis[0] ?? 0,
            spatialAxis[nRows - 1] ?? 0,
            margin,
          ),
        ];

  return {
    izeroLo: widenedIzero.sampleLo,
    izeroHi: widenedIzero.sampleHi,
    sampleRegions: widenedSamples,
  };
}
