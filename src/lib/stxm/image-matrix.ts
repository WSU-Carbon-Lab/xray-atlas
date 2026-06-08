/**
 * Converts oriented STXM `Float64Array` rows to nested number arrays for canvas math.
 */
export function float64ImageToMatrix(image: Float64Array[]): number[][] {
  return image.map((row) => Array.from(row));
}

/**
 * Returns per-row mean intensity across all energy columns.
 */
export function rowMeanProfile(image: Float64Array[]): number[] {
  return image.map((row) => {
    let sum = 0;
    for (const value of row) {
      sum += value;
    }
    return row.length > 0 ? sum / row.length : 0;
  });
}
