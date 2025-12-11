/**
 * Component for rendering vertical peak indicator lines
 */

import { memo } from "react";
import type { Peak } from "../../core/types";
import type { VisxScales } from "../../hooks/useVisxScales";
import type { PlotDimensions } from "../../core/types";
import { PEAK_COLORS } from "../../core/constants";

export const PeakIndicators = memo(function PeakIndicators({
  peaks,
  scales,
  dimensions,
  selectedPeakId,
}: {
  peaks: Peak[];
  scales: VisxScales;
  dimensions: PlotDimensions;
  selectedPeakId?: string | null;
}) {
  if (peaks.length === 0) return null;

  const plotHeight =
    dimensions.height - dimensions.margins.top - dimensions.margins.bottom;
  const top = dimensions.margins.top;
  const left = dimensions.margins.left;
  const xPosition = (energy: number) => scales.xScale(energy) + left;

  return (
    <g>
      {peaks.map((peak, peakIndex) => {
        const peakId = peak.id ?? `peak-${peakIndex}-${peak.energy}`;
        const isSelected = selectedPeakId === peakId;
        const x = xPosition(peak.energy);

        return (
          <line
            key={peakId}
            x1={x}
            x2={x}
            y1={top}
            y2={top + plotHeight}
            stroke={isSelected ? PEAK_COLORS.selected : PEAK_COLORS.unselected}
            strokeWidth={isSelected ? 1.5 : 1}
            strokeDasharray={isSelected ? "none" : "4,4"}
            pointerEvents="stroke"
            style={{ cursor: "pointer" }}
          />
        );
      })}
    </g>
  );
});
