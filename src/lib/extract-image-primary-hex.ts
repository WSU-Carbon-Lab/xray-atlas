/**
 * Derives a role-style accent hex from raw RGBA image pixels (row-major, four bytes per pixel: R, G, B, A).
 * Buckets colors in RGB space, weights counts by saturation so muted backgrounds rank below brand hues,
 * and skips nearly transparent, near-white, and near-black samples. Falls back to an opaque-pixel average
 * when every sample would otherwise be discarded.
 *
 * @param pixels - Contiguous RGBA buffer; length must be at least `width * height * 4`.
 * @param width - Image width in pixels; must be positive.
 * @param height - Image height in pixels; must be positive.
 * @returns Uppercase `#RRGGBB`, or `null` when no usable pixels exist.
 */
export function primaryHexFromRgbaBuffer(
  pixels: Uint8Array,
  width: number,
  height: number,
): string | null {
  if (width <= 0 || height <= 0) {
    return null;
  }
  const expected = width * height * 4;
  if (pixels.length < expected) {
    return null;
  }

  const shift = 4;
  type Acc = { w: number; r: number; g: number; b: number };
  const buckets = new Map<string, Acc>();

  let fallbackR = 0;
  let fallbackG = 0;
  let fallbackB = 0;
  let fallbackN = 0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const r = pixels[i]!;
      const g = pixels[i + 1]!;
      const b = pixels[i + 2]!;
      const a = pixels[i + 3]!;
      if (a < 12) {
        continue;
      }
      fallbackR += r;
      fallbackG += g;
      fallbackB += b;
      fallbackN += 1;

      const mx = Math.max(r, g, b);
      const mn = Math.min(r, g, b);
      if (mx >= 252 && mn >= 252) {
        continue;
      }
      if (mx <= 4 && mn <= 4) {
        continue;
      }

      const sat = (mx - mn) / 255;
      const key = `${r >> shift},${g >> shift},${b >> shift}`;
      const weight = 1 + sat * 4;
      const cur = buckets.get(key);
      if (cur) {
        cur.w += weight;
        cur.r += r * weight;
        cur.g += g * weight;
        cur.b += b * weight;
      } else {
        buckets.set(key, {
          w: weight,
          r: r * weight,
          g: g * weight,
          b: b * weight,
        });
      }
    }
  }

  let best: Acc | null = null;
  for (const v of buckets.values()) {
    if (!best || v.w > best.w) {
      best = v;
    }
  }

  if (best && best.w > 0) {
    const r = Math.round(best.r / best.w);
    const g = Math.round(best.g / best.w);
    const b = Math.round(best.b / best.w);
    return rgbToHex(r, g, b);
  }

  if (fallbackN === 0) {
    return null;
  }
  return rgbToHex(
    Math.round(fallbackR / fallbackN),
    Math.round(fallbackG / fallbackN),
    Math.round(fallbackB / fallbackN),
  );
}

function rgbToHex(r: number, g: number, b: number): string {
  const to = (n: number) =>
    Math.min(255, Math.max(0, n)).toString(16).padStart(2, "0");
  return `#${to(r)}${to(g)}${to(b)}`.toUpperCase();
}
