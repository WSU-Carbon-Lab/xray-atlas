/**
 * Hook for generating peak indicator line shapes
 */

import { useMemo } from "react";
import type { Layout } from "plotly.js";
import type { Peak } from "../core/types";
import { PEAK_COLORS } from "../core/constants";

/**
 * Generate Plotly shapes for peak indicator lines
 */
export function usePeakShapes(
  peaks: Peak[],
  selectedPeakId: string | null,
): Layout["shapes"] {
  return useMemo(() => {
    return peaks.map((peak) => {
      const peakId = peak.id ?? `peak-${peak.energy}`;
      const isSelected = selectedPeakId === peakId;
      return {
        type: "line" as const,
        xref: "x" as const,
        yref: "paper" as const,
        x0: peak.energy,
        x1: peak.energy,
        y0: 0,
        y1: 1,
        line: {
          color: isSelected ? PEAK_COLORS.selected : PEAK_COLORS.unselected,
          width: isSelected ? 1.5 : 1,
          dash: isSelected ? "solid" : "dash",
        },
        layer: "above" as const,
        editable: true,
        name: peakId,
      };
    });
  }, [peaks, selectedPeakId]);
}
