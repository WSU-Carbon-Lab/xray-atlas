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
