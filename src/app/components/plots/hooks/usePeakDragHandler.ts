/**
 * Hook for handling peak drag-to-edit interactions
 */

import { useEffect, type RefObject } from "react";
import type { Layout } from "plotly.js";
import type { Peak } from "../core/types";

/**
 * Set up drag handlers for peak energy editing via Plotly relayout
 */
export function usePeakDragHandler(
  plotRef: RefObject<HTMLDivElement>,
  peaks: Peak[],
  onPeakUpdate: ((peakId: string, energy: number) => void) | undefined,
  combinedLayout: Layout,
): void {
  useEffect(() => {
    if (!plotRef.current || !onPeakUpdate) return;

    const plotElement = plotRef.current.querySelector(".js-plotly-plot");
    if (!plotElement) return;

    // Handle peak drag-to-edit via Plotly's relayout event
    const handleRelayout = (event: Event) => {
      const plotlyEvent = event as unknown as {
        data?: Record<string, unknown>;
        update?: Record<string, unknown>;
      };

      const updateData = plotlyEvent.data ?? plotlyEvent.update;
      if (!updateData || typeof updateData !== "object") return;

      // Check for shape updates (when peaks are dragged)
      Object.keys(updateData).forEach((key) => {
        if (
          key.startsWith("shapes[") &&
          (key.includes(".x0") || key.includes(".x1"))
        ) {
          const regex = /shapes\[(\d+)\]\.x[01]/;
          const match = regex.exec(key);
          if (match) {
            const shapeIndex = parseInt(match[1] ?? "0", 10);
            const newEnergy = updateData[key];
            if (typeof newEnergy === "number") {
              const shape = combinedLayout.shapes?.[shapeIndex];
              if (shape?.type === "line" && shape.name) {
                const peakId: string = shape.name;
                const originalPeak = peaks.find((p) => {
                  const pId = p.id ?? `peak-${p.energy}`;
                  return pId === peakId;
                });
                if (
                  originalPeak &&
                  Math.abs(originalPeak.energy - newEnergy) > 0.01
                ) {
                  const roundedEnergy = Math.round(newEnergy * 100) / 100;
                  onPeakUpdate(peakId, roundedEnergy);
                }
              }
            }
          }
        }
      });
    };

    const safeRelayoutHandler = (e: Event) => {
      try {
        handleRelayout(e);
      } catch (error) {
        console.warn("Error handling plotly relayout:", error);
      }
    };

    plotElement.addEventListener("plotly_relayout", safeRelayoutHandler);

    return () => {
      plotElement.removeEventListener("plotly_relayout", safeRelayoutHandler);
    };
  }, [plotRef, peaks, onPeakUpdate, combinedLayout]);
}
