/**
 * Decodes STXM `.xim` payload text into a row-major 2D `Float64Array` stack.
 * Atlas STXM line scans at ALS 5.3.2.2 use ASCII whitespace-separated values
 * (one row per line), matching the Python `stxm.io.read_xim` loader.
 */

function decodeXimText(text: string): number[] {
  const trimmed = text.trim();
  if (trimmed.length === 0) {
    return [];
  }
  const lines = trimmed.split(/\r?\n/);
  const values: number[] = [];
  for (const line of lines) {
    const row = line.trim();
    if (row.length === 0) {
      continue;
    }
    const tokens = row.split(/\s+/);
    for (const token of tokens) {
      const value = Number.parseFloat(token);
      if (!Number.isFinite(value)) {
        throw new Error(`Invalid numeric token in xim: ${token}`);
      }
      values.push(value);
    }
  }
  return values;
}

/**
 * Loads an STXM `.xim` ASCII image into a 2D array with shape
 * `(nRows, nCols)` when `shape` is supplied.
 *
 * @param source - `.xim` file contents as UTF-8 text or an `ArrayBuffer` decoded as UTF-8.
 * @param shape - Optional `(nRows, nCols)` from the paired `.hdr` counts.
 * @returns Row-major 2D array of intensities as nested `Float64Array` rows.
 * @throws {Error} When the payload is 1D without a shape or size mismatches `shape`.
 */
export function readXim(
  source: string | ArrayBuffer,
  shape?: readonly [number, number],
): Float64Array[] {
  const text =
    typeof source === "string"
      ? source
      : new TextDecoder("utf-8").decode(source);
  const flat = decodeXimText(text);

  if (flat.length === 0) {
    throw new Error("xim file is empty");
  }

  if (shape === undefined) {
    if (flat.length === 1) {
      throw new Error("xim is 1D; provide shape=(nRows, nCols)");
    }
    return [Float64Array.from(flat)];
  }

  const [nRows, nCols] = shape;
  const expected = nRows * nCols;
  if (flat.length !== expected) {
    throw new Error(
      `xim value count ${flat.length} does not match shape (${nRows}, ${nCols})`,
    );
  }

  const rows: Float64Array[] = [];
  for (let row = 0; row < nRows; row += 1) {
    const start = row * nCols;
    rows.push(Float64Array.from(flat.slice(start, start + nCols)));
  }
  return rows;
}
