import type React from "react";
import { useVisxPeakInteractions } from "../hooks/useVisxPeakInteractions";
import type { Peak, PlotDimensions } from "../types";
import type { VisxScales } from "../hooks/useVisxScales";
import { InteractivePeak } from "./InteractivePeak";
import { peakStableId } from "../utils/peakStableId";

export function PeakOverlayLayer({
  isActive,
  peaks,
  scales,
  dimensions,
  selectedPeakId,
  isManualPeakMode,
  onPeakSelect,
  onPeakAdd,
  onPeakDelete,
  onPeakUpdate,
  onPeakEnergyUpdate,
  plotRef,
  getYValueAtEnergy,
}: {
  isActive: boolean;
  peaks: Peak[];
  scales: VisxScales;
  dimensions: PlotDimensions;
  selectedPeakId?: string | null;
  isManualPeakMode: boolean;
  onPeakSelect?: (peakId: string | null) => void;
  onPeakAdd?: (energy: number) => void;
  onPeakDelete?: (peakId: string) => void;
  onPeakUpdate?: (peakId: string, energy: number) => void;
  onPeakEnergyUpdate?: (peakId: string, energy: number) => void;
  plotRef: React.RefObject<SVGSVGElement | null>;
  getYValueAtEnergy: (energy: number) => number;
}) {
  const plotWidth =
    dimensions.width - dimensions.margins.left - dimensions.margins.right;
  const plotHeight =
    dimensions.height - dimensions.margins.top - dimensions.margins.bottom;

  const { handleClick } = useVisxPeakInteractions({
    peaks,
    scales,
    dimensions,
    selectedPeakId,
    onPeakSelect,
    onPeakAdd,
    onPeakDelete: isActive ? onPeakDelete : undefined,
    onPeakUpdate,
    isManualPeakMode,
    plotRef,
  });

  if (!isActive) return null;

  return (
    <>
      <rect
        width={plotWidth}
        height={plotHeight}
        fill="transparent"
        pointerEvents="all"
        onClick={(e) =>
          handleClick(e as unknown as React.MouseEvent<SVGSVGElement, MouseEvent>)
        }
      />
      {peaks.map((peak, peakIndex) => {
        const peakId = peakStableId(peak, peakIndex);
        return (
          <InteractivePeak
            key={peakId}
            peak={peak}
            peakIndex={peakIndex}
            scales={scales}
            dimensions={dimensions}
            isSelected={selectedPeakId === peakId}
            onEnergyUpdate={onPeakEnergyUpdate}
            plotSvgRef={plotRef}
            getYValueAtEnergy={getYValueAtEnergy}
          />
        );
      })}
    </>
  );
}

