import type { SpectrumPoint } from "~/components/plots/types";

export function defaultNormalizationRangesFromSpectrum(
  spectrumPoints: SpectrumPoint[],
): { pre: [number, number]; post: [number, number] } | null {
  if (spectrumPoints.length < 2) return null;
  const sorted = [...spectrumPoints].sort((a, b) => a.energy - b.energy);
  const n = sorted.length;
  let preSlice: SpectrumPoint[];
  let postSlice: SpectrumPoint[];
  if (n >= 20) {
    preSlice = sorted.slice(0, 10);
    postSlice = sorted.slice(n - 10);
  } else {
    const mid = Math.floor(n / 2);
    const preLen = Math.min(10, Math.max(1, mid));
    const postLen = Math.min(10, Math.max(1, n - mid));
    preSlice = sorted.slice(0, preLen);
    postSlice = sorted.slice(n - postLen);
    if (postSlice.length === 0) {
      postSlice = sorted.slice(-1);
      preSlice = sorted.slice(0, Math.max(1, n - 1));
    }
  }
  const preE = preSlice.map((p) => p.energy);
  const postE = postSlice.map((p) => p.energy);
  return {
    pre: [Math.min(...preE), Math.max(...preE)],
    post: [Math.min(...postE), Math.max(...postE)],
  };
}
