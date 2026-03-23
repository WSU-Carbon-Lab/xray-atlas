"use client";

import { useState, useCallback, useEffect } from "react";
import { useTheme } from "next-themes";
import type { Peak, PlotDimensions } from "../types";
import type { VisxScales } from "../hooks/useVisxScales";
import { PEAK_COLORS } from "../constants";
import { peakStableId } from "../utils/peakStableId";

export function InteractivePeak({
  peak,
  peakIndex,
  scales,
  dimensions,
  isSelected,
  onEnergyUpdate,
  plotSvgRef,
  getYValueAtEnergy: _getYValueAtEnergy,
  handlesOnlyWhenSelected = false,
}: {
  peak: Peak;
  peakIndex: number;
  scales: VisxScales;
  dimensions: PlotDimensions;
  isSelected: boolean;
  onEnergyUpdate?: (peakId: string, energy: number) => void;
  plotSvgRef: React.RefObject<SVGSVGElement | null>;
  getYValueAtEnergy: (energy: number) => number;
  handlesOnlyWhenSelected?: boolean;
}) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const peakId = peakStableId(peak, peakIndex);
  const energy = peak.energy;
  const xPos = scales.xScale(energy);
  const plotHeight =
    dimensions.height - dimensions.margins.top - dimensions.margins.bottom;
  const railInset = 11;
  const topCenterY = railInset;
  const bottomCenterY = Math.max(railInset, plotHeight - railInset);
  const pillW = isSelected ? 24 : 20;
  const pillH = 14;
  const hitPadX = 26;
  const hitH = 32;
  const dualHandles = bottomCenterY - topCenterY >= hitH - 2;

  const [isDragging, setIsDragging] = useState(false);
  const left = dimensions.margins.left;

  const handlePointerMove = useCallback(
    (event: PointerEvent) => {
      if (!isDragging || !onEnergyUpdate) return;
      const svg = plotSvgRef.current;
      if (!svg) return;
      const rect = svg.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const adjustedX = x - left;
      const plotWidth =
        dimensions.width - left - dimensions.margins.right;
      if (adjustedX < 0 || adjustedX > plotWidth) return;
      const newEnergy = scales.xScale.invert(adjustedX);
      const roundedEnergy = Math.round(newEnergy * 100) / 100;
      onEnergyUpdate(peakId, roundedEnergy);
    },
    [
      isDragging,
      onEnergyUpdate,
      peakId,
      scales.xScale,
      left,
      dimensions.width,
      dimensions.margins.right,
      plotSvgRef,
    ],
  );

  const handlePointerUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (!isDragging) return;
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerUp);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);
    };
  }, [isDragging, handlePointerMove, handlePointerUp]);

  const handlePointerDown = (e: React.PointerEvent<SVGRectElement>) => {
    if (!onEnergyUpdate) return;
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const fill = isSelected ? PEAK_COLORS.selected : PEAK_COLORS.unselected;
  const outline = isDark
    ? "rgba(248,250,252,0.94)"
    : "rgba(15,23,42,0.88)";
  const cursor = onEnergyUpdate
    ? isDragging
      ? "grabbing"
      : "grab"
    : "default";

  if (handlesOnlyWhenSelected && !isSelected) return null;

  const handlePair = (centerY: number, key: string) => {
    const hitTop = centerY - hitH / 2;
    return (
      <g key={key}>
        <rect
          x={xPos - hitPadX}
          y={hitTop}
          width={hitPadX * 2}
          height={hitH}
          fill="transparent"
          cursor={cursor}
          onPointerDown={handlePointerDown}
          style={{ touchAction: "none" }}
        />
        <rect
          x={xPos - pillW / 2}
          y={centerY - pillH / 2}
          width={pillW}
          height={pillH}
          rx={pillH / 2}
          fill={fill}
          stroke={outline}
          strokeWidth={isSelected ? 2 : 1.5}
          opacity={isDragging ? 0.92 : 1}
          pointerEvents="none"
        />
      </g>
    );
  };

  return (
    <g style={{ pointerEvents: onEnergyUpdate ? "all" : "none" }}>
      {handlePair(topCenterY, "top")}
      {dualHandles ? handlePair(bottomCenterY, "bottom") : null}
    </g>
  );
}
