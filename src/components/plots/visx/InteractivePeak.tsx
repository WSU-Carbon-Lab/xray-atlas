/**
 * Interactive peak component with drag handles
 */

import { useState, useCallback, useEffect } from "react";
import type { Peak, PlotDimensions } from "../types";
import type { VisxScales } from "../hooks/useVisxScales";

export function InteractivePeak({
  peak,
  peakIndex,
  scales,
  dimensions,
  isSelected,
  onEnergyUpdate,
}: {
  peak: Peak;
  peakIndex: number;
  scales: VisxScales;
  dimensions: PlotDimensions;
  isSelected: boolean;
  onEnergyUpdate?: (peakId: string, energy: number) => void;
}) {
  const peakId = peak.id ?? `peak-${peakIndex}-${peak.energy}`;
  const energy = peak.energy;
  const amplitude = peak.amplitude ?? 1;

  const left = dimensions.margins.left;
  const top = dimensions.margins.top;

  // Position calculations for energy handle
  const xPos = scales.xScale(energy) + left;
  const yPos = scales.yScale(amplitude) + top;

  const [isDragging, setIsDragging] = useState(false);

  // Drag handler for energy (center handle)
  const handleMouseDown = useCallback(
    (event: React.MouseEvent) => {
      event.preventDefault();
      event.stopPropagation();
      setIsDragging(true);
    },
    [],
  );

  const handleMouseMove = useCallback(
    (event: MouseEvent) => {
      if (!isDragging || !onEnergyUpdate) return;

      // Find the SVG element to get proper coordinates
      const svg = (event.target as HTMLElement).closest("svg");
      if (!svg) return;

      const svgRect = svg.getBoundingClientRect();
      const x = event.clientX - svgRect.left;

      const adjustedX = x - left;
      const newEnergy = scales.xScale.invert(adjustedX);
      const roundedEnergy = Math.round(newEnergy * 100) / 100;
      onEnergyUpdate(peakId, roundedEnergy);
    },
    [isDragging, onEnergyUpdate, peakId, scales.xScale, left],
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      return () => {
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  if (!isSelected) return null;

  return (
    <g>
      {/* Energy drag handle (center) */}
      <circle
        cx={xPos}
        cy={yPos}
        r={isDragging ? 8 : 6}
        fill="#a60f2d"
        stroke="white"
        strokeWidth={2}
        cursor="move"
        onMouseDown={handleMouseDown}
        style={{ pointerEvents: "all" }}
      />
    </g>
  );
}
