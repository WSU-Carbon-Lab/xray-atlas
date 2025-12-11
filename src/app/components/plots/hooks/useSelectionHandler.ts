/**
 * Hook for handling plot selection events
 */

import { useCallback } from "react";
import type { PlotSelectionEvent } from "plotly.js";
import type { SpectrumSelection } from "../core/types";
import type { SpectrumDataResult } from "./useSpectrumData";

export type SelectionHandlerResult = {
  handleSelected: (event: PlotSelectionEvent) => void;
  handleDeselect: () => void;
};

/**
 * Create selection handlers for Plotly plot
 */
export function useSelectionHandler(
  groupedTraces: SpectrumDataResult,
  measurementTraceCount: number,
  onSelectionChange: ((selection: SpectrumSelection | null) => void) | undefined,
): SelectionHandlerResult {
  const handleSelected = useCallback(
    (event: PlotSelectionEvent) => {
      if (!onSelectionChange) return;
      if (!event?.points || event.points.length === 0) {
        onSelectionChange(null);
        return;
      }

      const measurementEnergies: number[] = [];
      const measurementAbsorptions: number[] = [];
      const geometryKeys = new Set<string>();

      event.points.forEach((point) => {
        if (typeof point.curveNumber === "number") {
          if (point.curveNumber >= measurementTraceCount) {
            return;
          }
          const key = groupedTraces.keys[point.curveNumber];
          if (key) {
            geometryKeys.add(key);
          }
        }
        if (typeof point.x === "number") {
          measurementEnergies.push(point.x);
        }
        if (typeof point.y === "number") {
          measurementAbsorptions.push(point.y);
        }
      });

      if (
        measurementEnergies.length === 0 ||
        measurementAbsorptions.length === 0
      ) {
        onSelectionChange(null);
        return;
      }

      const summary: SpectrumSelection = {
        energyMin: Math.min(...measurementEnergies),
        energyMax: Math.max(...measurementEnergies),
        absorptionMin: Math.min(...measurementAbsorptions),
        absorptionMax: Math.max(...measurementAbsorptions),
        pointCount: measurementEnergies.length,
        geometryKeys: Array.from(geometryKeys),
      };

      onSelectionChange(summary);
    },
    [groupedTraces.keys, measurementTraceCount, onSelectionChange],
  );

  const handleDeselect = useCallback(() => {
    onSelectionChange?.(null);
  }, [onSelectionChange]);

  return {
    handleSelected,
    handleDeselect,
  };
}
