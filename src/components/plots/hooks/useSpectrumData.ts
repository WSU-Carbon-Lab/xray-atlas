/**
 * Hook for processing spectrum data and grouping by geometry
 */

import { useMemo } from "react";
import type { TraceData, SpectrumPoint, DifferenceSpectrum } from "../types";
import { COLORS } from "../constants";
import { groupPointsByGeometry } from "../utils/trace-utils";

export type SpectrumDataResult = {
  traces: TraceData[];
  keys: string[];
  groups: Map<string, { label: string; theta?: number; phi?: number; energies: number[]; absorptions: number[] }>;
};

/**
 * Process spectrum points and group them by geometry
 */
export function useSpectrumData(
  points: SpectrumPoint[],
  showThetaData: boolean,
  showPhiData: boolean,
  differenceSpectra: DifferenceSpectrum[],
): SpectrumDataResult {
  return useMemo(() => {
    // Filter points based on showThetaData and showPhiData
    // If difference spectra are being shown, don't show original data
    const showOriginalData =
      !differenceSpectra || differenceSpectra.length === 0;

    const filteredPoints = showOriginalData
      ? points.filter((point) => {
          const hasGeometry =
            typeof point.theta === "number" &&
            Number.isFinite(point.theta) &&
            typeof point.phi === "number" &&
            Number.isFinite(point.phi);

          if (!hasGeometry) {
            // Show fixed geometry points only if neither theta nor phi data is shown
            return !showThetaData && !showPhiData;
          }

          // If showing theta data, show all points (they all have theta)
          if (showThetaData) {
            return true;
          }

          // If showing phi data, show all points (they all have phi)
          if (showPhiData) {
            return true;
          }

          // If neither is shown, show all points (default behavior)
          return true;
        })
      : [];

    const groups = groupPointsByGeometry(filteredPoints);

    const traces: TraceData[] = [];
    let index = 0;
    groups.forEach((group, key) => {
      const color = COLORS[index] ?? `hsl(${(index * 57) % 360} 65% 55%)`;
      traces.push({
        type: "scattergl",
        mode: "lines+markers",
        name: group.label || key,
        x: group.energies,
        y: group.absorptions,
        marker: {
          color,
          size: 4,
          opacity: 0.7,
        },
        line: {
          color,
          width: 1.6,
        },
        hovertemplate:
          `<b>${group.label || key}</b><br>` +
          "Energy: %{x:.3f} eV<br>Intensity: %{y:.4f}" +
          "<extra></extra>",
      });
      index += 1;
    });

    return { traces, keys: Array.from(groups.keys()), groups };
  }, [points, showThetaData, showPhiData, differenceSpectra]);
}
