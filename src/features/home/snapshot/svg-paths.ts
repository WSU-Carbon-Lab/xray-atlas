/**
 * Pure helpers that turn sorted (energy, value) samples into compact SVG path
 * strings on a fixed viewBox. Used only by the snapshot generator; output is
 * committed, so determinism matters: identical input yields identical strings.
 */

export interface XY {
  x: number;
  y: number;
}

/** Linear map from `domain` to `range`; a zero-width domain maps to range midpoint. */
export function buildLinearScale(
  domain: readonly [number, number],
  range: readonly [number, number],
): (v: number) => number {
  const [d0, d1] = domain;
  const [r0, r1] = range;
  const span = d1 - d0;
  if (span === 0 || !Number.isFinite(span)) {
    const mid = (r0 + r1) / 2;
    return () => mid;
  }
  return (v) => r0 + ((v - d0) / span) * (r1 - r0);
}

/**
 * Uniform-stride decimation of an x-sorted series to at most `max` samples,
 * always keeping the first and last sample. Non-finite samples are dropped.
 */
export function decimateSorted(points: readonly XY[], max: number): XY[] {
  const finite = points.filter(
    (p) => Number.isFinite(p.x) && Number.isFinite(p.y),
  );
  if (finite.length <= max) return finite;
  const out: XY[] = [];
  const step = (finite.length - 1) / (max - 1);
  for (let i = 0; i < max; i++) {
    out.push(finite[Math.round(i * step)]!);
  }
  return out;
}

/** SVG `d` for a polyline through `points` already in viewBox coordinates, 1 decimal place. */
export function buildTracePath(points: readonly XY[]): string {
  if (points.length === 0) return "";
  return points
    .map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join("");
}

/** Round tick positions with step from {1,2,5}x10^k covering `domain` with about `target` ticks. */
export function niceTicks(
  domain: readonly [number, number],
  target: number,
): number[] {
  const [a, b] = domain;
  const raw = (b - a) / Math.max(1, target);
  const mag = 10 ** Math.floor(Math.log10(raw));
  const norm = raw / mag;
  const step = (norm < 1.5 ? 1 : norm < 3.5 ? 2 : norm < 7.5 ? 5 : 10) * mag;
  const ticks: number[] = [];
  for (let t = Math.ceil(a / step) * step; t <= b + 1e-9; t += step) {
    ticks.push(Number(t.toFixed(6)));
  }
  return ticks;
}

/** Plot-area padding in viewBox units shared by the snapshot generator and the figure renderer. */
export const SPECTRUM_PAD = { l: 48, r: 16, t: 32, b: 36 } as const;
