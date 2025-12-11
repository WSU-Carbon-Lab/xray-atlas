/**
 * Hook for handling peak click interactions
 */

import { useEffect, type RefObject } from "react";
import type { Layout } from "plotly.js";
import type { Peak } from "../core/types";
import { pixelToData, findClosestPeak, calculateProximityThreshold } from "../utils/coordinateUtils";
import { MARGINS } from "../core/constants";

/**
 * Set up click handlers for peak selection and addition
 */
export function usePeakClickHandler(
  plotRef: RefObject<HTMLDivElement>,
  peaks: Peak[],
  selectedPeakId: string | null,
  isManualPeakMode: boolean,
  onPeakAdd: ((energy: number) => void) | undefined,
  onPeakSelect: ((peakId: string | null) => void) | undefined,
  combinedLayout: Layout,
): void {
  useEffect(() => {
    if (!plotRef.current) return;

    const plotElement = plotRef.current.querySelector(".js-plotly-plot");
    if (!plotElement) return;

    // Handle peak clicks - detect clicks on or near peak lines
    const handlePlotClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target || !plotElement) return;

      // Get click position and convert to data coordinates
      const rect = (plotElement as HTMLElement).getBoundingClientRect();
      const clickXPixel = event.clientX - rect.left;

      // Convert pixel coordinates to data coordinates
      const xAxis = combinedLayout.xaxis;
      const yAxis = combinedLayout.yaxis;
      const xAxisRange = xAxis?.range;
      const yAxisRange = yAxis?.range;
      if (
        xAxisRange &&
        typeof xAxisRange === "object" &&
        Array.isArray(xAxisRange) &&
        xAxisRange.length === 2 &&
        yAxisRange &&
        typeof yAxisRange === "object" &&
        Array.isArray(yAxisRange) &&
        yAxisRange.length === 2
      ) {
        const xMinRaw: unknown = xAxisRange[0];
        const xMaxRaw: unknown = xAxisRange[1];
        const yMinRaw: unknown = yAxisRange[0];
        const yMaxRaw: unknown = yAxisRange[1];
        if (
          typeof xMinRaw !== "number" ||
          typeof xMaxRaw !== "number" ||
          typeof yMinRaw !== "number" ||
          typeof yMaxRaw !== "number"
        )
          return;
        const xMin = xMinRaw;
        const xMax = xMaxRaw;

        const { x: dataX } = pixelToData(
          clickXPixel,
          0,
          [xMin, xMax],
          [yMinRaw, yMaxRaw],
          rect.width,
          rect.height,
          MARGINS.left,
          MARGINS.top,
        );

        // If in manual peak mode, add a peak at the clicked location
        if (isManualPeakMode && onPeakAdd) {
          event.preventDefault();
          event.stopPropagation();
          onPeakAdd(dataX);
          return;
        }

        // Otherwise, handle peak selection (existing behavior)
        if (!onPeakSelect) return;

        // Check if click was directly on a shape (peak line)
        const isShapeElement =
          target.tagName === "path" ||
          target.closest('g[class*="shape"]') !== null ||
          target.closest('path[fill="none"]') !== null;

        // Find closest peak (within reasonable threshold)
        const threshold = calculateProximityThreshold([xMin, xMax]);
        const closestPeak = findClosestPeak(dataX, peaks, threshold);

        // If clicked on a shape element or near a peak, select it
        if (closestPeak || isShapeElement) {
          if (closestPeak) {
            const peakId: string =
              closestPeak.id ?? `peak-${closestPeak.energy}`;
            const currentSelectedId = selectedPeakId;
            // Toggle selection: if already selected, deselect; otherwise select
            onPeakSelect(currentSelectedId === peakId ? null : peakId);
            // Focus the plot container for keyboard events
            if (plotRef.current instanceof HTMLElement) {
              plotRef.current.focus();
            }
          } else if (isShapeElement) {
            // If we clicked on a shape but couldn't identify which peak,
            // try to find it by checking all peaks (fallback)
            peaks.forEach((peak) => {
              const distance = Math.abs(peak.energy - dataX);
              if (distance < 2.0) {
                const peakId: string = peak.id ?? `peak-${peak.energy}`;
                const currentSelectedId = selectedPeakId;
                onPeakSelect(currentSelectedId === peakId ? null : peakId);
                if (plotRef.current instanceof HTMLElement) {
                  plotRef.current.focus();
                }
              }
            });
          }
        }
      }
    };

    // Also listen for Plotly's click event as a fallback
    const handlePlotlyClick = (event: Event) => {
      if (!onPeakSelect) return;

      const plotlyClickEvent = event as unknown as {
        points?: Array<{
          x?: number;
          y?: number;
        }>;
        event?: {
          target?: HTMLElement;
        };
      };

      const clickX = plotlyClickEvent.points?.[0]?.x;
      if (clickX === undefined) return;

      const target = plotlyClickEvent.event?.target as HTMLElement | null;
      if (target) {
        // Check if click was on a shape
        const isShapeClick =
          target.tagName === "path" ||
          target.closest("g[class*='shape']") !== null;

        if (isShapeClick) {
          // Find the peak closest to the click X coordinate
          const closestPeak = findClosestPeak(clickX, peaks, 2.0);

          if (closestPeak) {
            const peakId: string =
              closestPeak.id ?? `peak-${closestPeak.energy}`;
            const currentSelectedId = selectedPeakId;
            onPeakSelect(currentSelectedId === peakId ? null : peakId);
            // Focus the plot container for keyboard events
            if (plotRef.current instanceof HTMLElement) {
              plotRef.current.focus();
            }
          }
        }
      }
    };

    plotElement.addEventListener(
      "plotly_click",
      handlePlotlyClick as EventListener,
    );
    plotElement.addEventListener(
      "click",
      handlePlotClick as EventListener,
      true,
    ); // Use capture phase

    return () => {
      plotElement.removeEventListener(
        "plotly_click",
        handlePlotlyClick as EventListener,
      );
      plotElement.removeEventListener(
        "click",
        handlePlotClick as EventListener,
        true,
      );
    };
  }, [
    plotRef,
    peaks,
    selectedPeakId,
    isManualPeakMode,
    onPeakAdd,
    onPeakSelect,
    combinedLayout,
  ]);
}
