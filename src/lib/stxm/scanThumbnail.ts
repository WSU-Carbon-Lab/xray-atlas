import { downsampleHeatmap, percentile, valueToGrayscaleByte } from "./heatmap";
import { loadStxm } from "./loadStxm";
import {
  validateStxmHdrMetadata,
  validateStxmFileSize,
  StxmValidationError,
} from "./validateStxmFile";

/**
 * Renders a linear-scale grayscale preview of any STXM 2D scan to a PNG data URL.
 * Contrast uses 2nd–98th percentile of the downsampled matrix (stxm web app parity).
 */
export async function scanThumbnailDataUrl(
  hdrText: string,
  ximBuffer: ArrayBuffer,
  hdrByteLength: number,
  width = 120,
  height = 96,
): Promise<string | null> {
  try {
    validateStxmFileSize(hdrByteLength, "hdr");
    validateStxmFileSize(ximBuffer.byteLength, "xim");
    const summary = loadStxm(hdrText, ximBuffer);
    validateStxmHdrMetadata(summary.header);
    const { values } = downsampleHeatmap(summary.image, 64, 64);
    if (values.length === 0) {
      return null;
    }
    const flat = values.flat().filter(Number.isFinite);
    if (flat.length === 0) {
      return null;
    }
    let vmin = percentile(flat, 2);
    let vmax = percentile(flat, 98);
    if (!Number.isFinite(vmin) || !Number.isFinite(vmax) || vmin >= vmax) {
      vmin = Math.min(...flat);
      vmax = Math.max(...flat);
      if (!Number.isFinite(vmin) || !Number.isFinite(vmax) || vmin >= vmax) {
        vmin = 0;
        vmax = 1;
      }
    }

    const rows = values.length;
    const cols = values[0]?.length ?? 0;
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return null;
    }
    const cellW = width / cols;
    const cellH = height / rows;
    ctx.fillStyle = "rgb(39, 39, 42)";
    ctx.fillRect(0, 0, width, height);
    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col < cols; col += 1) {
        const value = values[row]?.[col] ?? 0;
        const gray = valueToGrayscaleByte(value, vmin, vmax);
        ctx.fillStyle = `rgb(${gray}, ${gray}, ${gray})`;
        ctx.fillRect(col * cellW, row * cellH, cellW + 1, cellH + 1);
      }
    }
    return canvas.toDataURL("image/png");
  } catch (error) {
    if (error instanceof StxmValidationError) {
      return null;
    }
    return null;
  }
}

/**
 * @deprecated Use {@link scanThumbnailDataUrl} for all scan types.
 */
export async function lineScanThumbnailDataUrl(
  hdrText: string,
  ximBuffer: ArrayBuffer,
  width = 120,
  height = 96,
): Promise<string | null> {
  return scanThumbnailDataUrl(hdrText, ximBuffer, hdrText.length, width, height);
}
