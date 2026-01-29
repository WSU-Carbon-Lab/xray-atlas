/**
 * Component for rendering Gaussian peak curves
 */

import { memo } from "react";
import { LinePath } from "@visx/shape";
import { curveLinear } from "@visx/curve";
import type { Peak } from "../types";
import type { VisxScales } from "../hooks/useVisxScales";
import { generateGaussianPeak } from "~/app/contribute/nexafs/utils";

export const PeakCurves = memo(function PeakCurves({
  peaks,
  scales,
  selectedPeakId,
  energyRange,
}: {
  peaks: Peak[];
  scales: VisxScales;
  selectedPeakId?: string | null;
  energyRange: number[];
}) {
  if (peaks.length === 0 || energyRange.length === 0) return null;

  // Filter out step peaks
  const nonStepPeaks = peaks.filter((peak) => !peak.isStep);

  return (
    <g>
      {nonStepPeaks.map((peak, peakIndex) => {
        const peakId = peak.id ?? `peak-${peakIndex}-${peak.energy}`;
        const isSelected = selectedPeakId === peakId;

        const amplitude = peak.amplitude ?? 1;
        const width = peak.width ?? 0.1;

        // Generate Gaussian curve
        const intensities = generateGaussianPeak(
          { energy: peak.energy, amplitude, width },
          energyRange,
        );

        // Create points array
        const points = energyRange.map((energy, i) => ({
          x: energy,
          y: intensities[i] ?? 0,
        }));

        return (
          <LinePath
            key={peakId}
            data={points}
            x={(d) => scales.xScale(d.x)}
            y={(d) => scales.yScale(d.y)}
            stroke={isSelected ? "#a60f2d" : "#6b7280"}
            strokeWidth={isSelected ? 2 : 1.5}
            strokeDasharray={isSelected ? "none" : "4,4"}
            curve={curveLinear}
          />
        );
      })}
    </g>
  );
});
