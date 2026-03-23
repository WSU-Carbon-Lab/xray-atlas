/**
 * Hook for handling peak interactions in visx (click, drag, keyboard)
 */

import { useCallback, useEffect } from "react";
import type { Peak, PlotDimensions } from "../types";
import type { VisxScales } from "./useVisxScales";
import { peakStableId } from "../utils/peakStableId";

export function useVisxPeakInteractions({
  peaks,
  scales,
  dimensions,
  selectedPeakId,
  onPeakSelect,
  onPeakAdd,
  onPeakDelete,
  onPeakUpdate: _onPeakUpdate,
  isManualPeakMode,
  plotRef,
}: {
  peaks: Peak[];
  scales: VisxScales;
  dimensions: PlotDimensions;
  selectedPeakId?: string | null;
  onPeakSelect?: (peakId: string | null) => void;
  onPeakAdd?: (energy: number) => void;
  onPeakDelete?: (peakId: string) => void;
  onPeakUpdate?: (peakId: string, energy: number) => void;
  isManualPeakMode?: boolean;
  plotRef: React.RefObject<SVGSVGElement | null>;
}) {
  const plotWidth =
    dimensions.width - dimensions.margins.left - dimensions.margins.right;
  const plotHeight =
    dimensions.height - dimensions.margins.top - dimensions.margins.bottom;

  // Find closest peak to a click position
  const findClosestPeak = useCallback(
    (clickX: number, clickY: number): { peak: Peak; index: number } | null => {
      if (peaks.length === 0) return null;

      const adjustedX = clickX - dimensions.margins.left;
      const adjustedY = clickY - dimensions.margins.top;

      if (
        adjustedX < 0 ||
        adjustedX > plotWidth ||
        adjustedY < 0 ||
        adjustedY > plotHeight
      ) {
        return null;
      }

      const clickEnergy = scales.xScale.invert(adjustedX);

      // Find closest peak within threshold
      const domain = scales.xScale.domain();
      if (
        !domain ||
        domain.length < 2 ||
        typeof domain[0] !== "number" ||
        typeof domain[1] !== "number"
      ) {
        return null;
      }
      const energyRange = domain[1] - domain[0];
      const threshold = Math.min(energyRange * 0.02, 2.0); // 2% of range or 2 eV

      let closestPeak: Peak | null = null;
      let closestIndex = -1;
      let minDistance = Infinity;

      for (let i = 0; i < peaks.length; i++) {
        const peak = peaks[i]!;
        const distance = Math.abs(peak.energy - clickEnergy);
        if (distance < minDistance && distance < threshold) {
          minDistance = distance;
          closestPeak = peak;
          closestIndex = i;
        }
      }

      return closestPeak && closestIndex >= 0
        ? { peak: closestPeak, index: closestIndex }
        : null;
    },
    [peaks, scales.xScale, dimensions.margins, plotWidth, plotHeight],
  );

  // Handle click on plot
  const handleClick = useCallback(
    (event: React.MouseEvent<SVGSVGElement>) => {
      if (!plotRef.current) return;

      const rect = plotRef.current.getBoundingClientRect();
      const clickX = event.clientX - rect.left;
      const clickY = event.clientY - rect.top;

      // Check if click is within plot bounds
      if (
        clickX < dimensions.margins.left ||
        clickX > dimensions.width - dimensions.margins.right ||
        clickY < dimensions.margins.top ||
        clickY > dimensions.height - dimensions.margins.bottom
      ) {
        return;
      }

      const hit = findClosestPeak(clickX, clickY);

      if (isManualPeakMode) {
        if (hit) {
          if (!onPeakSelect) return;
          const peakId = peakStableId(hit.peak, hit.index);
          const currentSelectedId = selectedPeakId;
          onPeakSelect(currentSelectedId === peakId ? null : peakId);
          return;
        }

        if (onPeakAdd) {
          const adjustedX = clickX - dimensions.margins.left;
          const energy = scales.xScale.invert(adjustedX);
          onPeakAdd(Math.round(energy * 100) / 100);
          return;
        }

        if (onPeakSelect) {
          onPeakSelect(null);
        }
        return;
      }

      // Explore mode: click selects/deselects peaks
      if (!onPeakSelect) return;
      if (hit) {
        const peakId = peakStableId(hit.peak, hit.index);
        const currentSelectedId = selectedPeakId;
        onPeakSelect(currentSelectedId === peakId ? null : peakId);
      } else {
        onPeakSelect(null);
      }
    },
    [
      plotRef,
      dimensions,
      scales.xScale,
      isManualPeakMode,
      onPeakAdd,
      onPeakSelect,
      selectedPeakId,
      findClosestPeak,
    ],
  );

  // Keyboard handler for delete
  useEffect(() => {
    if (!plotRef.current || !onPeakDelete || !selectedPeakId) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        (event.key === "Delete" || event.key === "Backspace") &&
        selectedPeakId &&
        !(event.target instanceof HTMLInputElement) &&
        !(event.target instanceof HTMLTextAreaElement)
      ) {
        event.preventDefault();
        event.stopPropagation();
        onPeakDelete(selectedPeakId);
      }
    };

    const svgElement = plotRef.current;
    svgElement.setAttribute("tabindex", "0");
    svgElement.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      svgElement.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [plotRef, selectedPeakId, onPeakDelete]);

  return {
    handleClick,
  };
}
