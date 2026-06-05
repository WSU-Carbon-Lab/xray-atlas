/**
 * Hook for processing spectrum data and grouping by geometry
 */

import { useMemo } from "react";
import type { TraceData, SpectrumPoint, DifferenceSpectrum } from "../types";
import {
  SPECTRUM_TRACE_GRADIENT_DARK,
  SPECTRUM_TRACE_GRADIENT_LIGHT,
  SPECTRUM_TRACE_LINE_WIDTH,
  spectrumTraceColorAlongGradient,
} from "../constants";
import {
  groupPointsByGeometry,
  sortedGeometryGroupEntries,
} from "../utils/trace-utils";

/**
 * Filters spectrum rows to the same set {@link useSpectrumData} turns into grouped line traces when
 * difference spectra are off: fixed-geometry rows appear only when neither θ-split nor φ-split is active;
 * angle-resolved rows follow the θ/φ toggle semantics used by the plot.
 *
 * @param points Source rows (typically the active view’s `plotPoints` where `absorption` holds the plotted y).
 * @param showThetaData When true, include every finite θ/φ row (θ-split mode).
 * @param showPhiData When true, include every finite θ/φ row (φ-split mode).
 * @returns A shallow-filtered array; does not sort energies or deduplicate.
 */
export function filterSpectrumPointsForGroupedPlot(
  points: SpectrumPoint[],
  showThetaData: boolean,
  showPhiData: boolean,
): SpectrumPoint[] {
  return points.filter((point) => {
    const hasGeometry =
      typeof point.theta === "number" &&
      Number.isFinite(point.theta) &&
      typeof point.phi === "number" &&
      Number.isFinite(point.phi);

    if (!hasGeometry) {
      return !showThetaData && !showPhiData;
    }

    if (showThetaData) {
      return true;
    }

    if (showPhiData) {
      return true;
    }

    return true;
  });
}

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
  isDark = true,
  primaryTraceLabel?: string,
): SpectrumDataResult {
  const palette = isDark ? SPECTRUM_TRACE_GRADIENT_DARK : SPECTRUM_TRACE_GRADIENT_LIGHT;
  return useMemo(() => {
    // Filter points based on showThetaData and showPhiData
    // If difference spectra are being shown, don't show original data
    const showOriginalData =
      !differenceSpectra || differenceSpectra.length === 0;

    const filteredPoints = showOriginalData
      ? filterSpectrumPointsForGroupedPlot(points, showThetaData, showPhiData)
      : [];

    let groups = groupPointsByGeometry(filteredPoints);
    const fixedLabel = primaryTraceLabel?.trim();
    if (fixedLabel && groups.has("fixed")) {
      const nextGroups = new Map(groups);
      const fixedGroup = nextGroups.get("fixed");
      if (fixedGroup) {
        nextGroups.set("fixed", { ...fixedGroup, label: fixedLabel });
      }
      groups = nextGroups;
    }
    const ordered = sortedGeometryGroupEntries(groups);
    const traceCount = ordered.length;

    const traces: TraceData[] = ordered.map(([key, group], index) => {
      const color = spectrumTraceColorAlongGradient(
        palette,
        index,
        traceCount,
      );
      const label =
        key === "fixed" && primaryTraceLabel?.trim()
          ? primaryTraceLabel.trim()
          : group.label || key;
      return {
        type: "scattergl" as const,
        mode: "lines+markers" as const,
        name: label,
        x: group.energies,
        y: group.absorptions,
        theta: group.theta,
        phi: group.phi,
        marker: {
          color,
          size: 4,
          opacity: 0.7,
        },
        line: {
          color,
          width: SPECTRUM_TRACE_LINE_WIDTH,
        },
        hovertemplate:
          `<b>${label}</b><br>` +
          "Energy: %{x:.3f} eV<br>Intensity: %{y:.4f}" +
          "<extra></extra>",
      };
    });

    return {
      traces,
      keys: ordered.map(([k]) => k),
      groups,
    };
  }, [points, showThetaData, showPhiData, differenceSpectra, palette, primaryTraceLabel]);
}
