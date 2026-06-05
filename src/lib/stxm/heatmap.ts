/**
 * Builds a downsampled heatmap matrix for canvas rendering of STXM line scans.
 */
export function downsampleHeatmap(
  image: Float64Array[],
  maxRows = 128,
  maxCols = 256,
): { values: number[][]; rowCount: number; colCount: number } {
  const nRows = image.length;
  const nCols = image[0]?.length ?? 0;
  if (nRows === 0 || nCols === 0) {
    return { values: [], rowCount: 0, colCount: 0 };
  }
  const rowStride = Math.max(1, Math.ceil(nRows / maxRows));
  const colStride = Math.max(1, Math.ceil(nCols / maxCols));
  const values: number[][] = [];
  for (let row = 0; row < nRows; row += rowStride) {
    const outRow: number[] = [];
    for (let col = 0; col < nCols; col += colStride) {
      outRow.push(image[row]?.[col] ?? 0);
    }
    values.push(outRow);
  }
  return {
    values,
    rowCount: values.length,
    colCount: values[0]?.length ?? 0,
  };
}

/**
 * Computes the p-th percentile of finite values in `samples`.
 */
export function percentile(samples: number[], p: number): number {
  const finite = samples.filter(Number.isFinite).sort((a, b) => a - b);
  if (finite.length === 0) {
    return Number.NaN;
  }
  const idx = (p / 100) * (finite.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) {
    return finite[lo] ?? Number.NaN;
  }
  const weight = idx - lo;
  return (finite[lo] ?? 0) * (1 - weight) + (finite[hi] ?? 0) * weight;
}

/**
 * Maps a linear intensity to an 8-bit grayscale byte using inclusive `[vmin, vmax]`.
 */
export function valueToGrayscaleByte(
  value: number,
  vmin: number,
  vmax: number,
): number {
  const span = vmax - vmin || 1;
  const normalized = (value - vmin) / span;
  const clamped = Math.max(0, Math.min(1, normalized));
  return Math.round(clamped * 255);
}
