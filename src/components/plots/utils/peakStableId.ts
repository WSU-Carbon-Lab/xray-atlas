import type { Peak } from "../types";

export function peakStableId(peak: Peak, peakIndex: number): string {
  return peak.id ?? `peak-${peakIndex}-${peak.energy}`;
}
