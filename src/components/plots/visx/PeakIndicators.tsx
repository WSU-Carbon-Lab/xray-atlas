/**
 * Component for rendering vertical peak indicator lines
 */

import { memo } from "react";
import type { Peak, PlotDimensions } from "../types";
import type { VisxScales } from "../hooks/useVisxScales";
import { PEAK_COLORS } from "../constants";
import { peakStableId } from "../utils/peakStableId";

export const PeakIndicators = memo(function PeakIndicators({
  peaks,
  scales,
  dimensions,
  selectedPeakId,
  variant = "default",
}: {
  peaks: Peak[];
  scales: VisxScales;
  dimensions: PlotDimensions;
  selectedPeakId?: string | null;
  variant?: "default" | "peak-edit";
}) {
  if (peaks.length === 0) return null;

  const plotHeight =
    dimensions.height - dimensions.margins.top - dimensions.margins.bottom;
  const isPeakEdit = variant === "peak-edit";

  return (
    <g>
      {peaks.map((peak, peakIndex) => {
        const peakId = peakStableId(peak, peakIndex);
        const isSelected = selectedPeakId === peakId;
        const x = scales.xScale(peak.energy);
        const base = isSelected ? PEAK_COLORS.selected : PEAK_COLORS.unselected;

        return (
          <line
            key={peakId}
            x1={x}
            x2={x}
            y1={0}
            y2={plotHeight}
            stroke={base}
            strokeWidth={isSelected ? 1.5 : 1}
            strokeDasharray={isSelected ? "none" : isPeakEdit ? "3 5" : "4 4"}
            strokeOpacity={isSelected ? 1 : isPeakEdit ? 0.32 : 0.72}
            pointerEvents="stroke"
            style={{ cursor: "pointer" }}
          />
        );
      })}
    </g>
  );
});
