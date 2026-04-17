"use client";

import { useTheme } from "next-themes";
import type { Peak, PlotDimensions } from "../types";
import type { VisxScales } from "../hooks/useVisxScales";
import { PEAK_COLORS } from "../constants";
import { peakStableId } from "../utils/peakStableId";
import { PinnedAxisMarker } from "../spectrum/PinnedAxisMarker";

/**
 * Thin wrapper that renders a peak's draggable axis handles via the shared
 * `PinnedAxisMarker`. Exists primarily to preserve the peak-specific
 * `(peakId, energy)` update signature used by the visx peak interaction
 * pipeline and to hide/show the marker based on the peak edit variant.
 */
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

  if (handlesOnlyWhenSelected && !isSelected) return null;

  const outline = isDark
    ? "rgba(248,250,252,0.94)"
    : "rgba(15,23,42,0.88)";

  return (
    <PinnedAxisMarker
      energy={peak.energy}
      xScale={scales.xScale}
      dimensions={dimensions}
      plotSvgRef={plotSvgRef}
      isSelected={isSelected}
      fill={PEAK_COLORS.unselected}
      selectedFill={PEAK_COLORS.selected}
      outline={outline}
      railColor={undefined}
      labelTop={undefined}
      hitPadX={26}
      onEnergyChange={
        onEnergyUpdate ? (energy) => onEnergyUpdate(peakId, energy) : undefined
      }
    />
  );
}
