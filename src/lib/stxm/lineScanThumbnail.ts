import { loadStxm } from "./loadStxm";
import { orientScan } from "./orientScan";
import { downsampleHeatmap } from "./heatmap";

function colorForValue(value: number, min: number, max: number): string {
  const span = max - min || 1;
  const t = Math.min(1, Math.max(0, (value - min) / span));
  const r = Math.round(20 + t * 200);
  const g = Math.round(30 + t * 80);
  const b = Math.round(80 + (1 - t) * 120);
  return `rgb(${r}, ${g}, ${b})`;
}

/**
 * Renders a downsampled line-scan heatmap to a PNG data URL for Finder-style previews.
 */
export async function lineScanThumbnailDataUrl(
  hdrText: string,
  ximBuffer: ArrayBuffer,
  width = 120,
  height = 96,
): Promise<string | null> {
  try {
    const summary = loadStxm(hdrText, ximBuffer);
    const oriented = orientScan(summary.header, summary.image);
    const { values } = downsampleHeatmap(oriented.image, 48, 64);
    if (values.length === 0) {
      return null;
    }
    const flat = values.flat();
    const min = Math.min(...flat);
    const max = Math.max(...flat);
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
    ctx.fillStyle = "rgb(24, 24, 27)";
    ctx.fillRect(0, 0, width, height);
    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col < cols; col += 1) {
        ctx.fillStyle = colorForValue(values[row]?.[col] ?? 0, min, max);
        ctx.fillRect(col * cellW, row * cellH, cellW + 1, cellH + 1);
      }
    }
    return canvas.toDataURL("image/png");
  } catch {
    return null;
  }
}
