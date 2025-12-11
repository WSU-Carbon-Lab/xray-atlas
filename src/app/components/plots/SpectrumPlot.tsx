"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";
import type { SpectrumPlotProps, SpectrumPoint, SpectrumSelection } from "./core/types";
import { DEFAULT_PLOT_HEIGHT } from "./core/constants";
import { useSpectrumData } from "./hooks/useSpectrumData";
import { useReferenceData } from "./hooks/useReferenceData";
import { usePeakVisualization } from "./hooks/usePeakVisualization";
import { useDataExtents } from "./hooks/useDataExtents";
import { usePlotLayout } from "./hooks/usePlotLayout";
import { useSelectionHandler } from "./hooks/useSelectionHandler";
import { usePeakInteractions } from "./hooks/usePeakInteractions";

const Plot = dynamic(() => import("react-plotly.js"), { ssr: false });

// Re-export types for backward compatibility
export type { SpectrumPoint, SpectrumSelection } from "./core/types";

export function SpectrumPlot({
  points,
  height = DEFAULT_PLOT_HEIGHT,
  energyStats,
  absorptionStats,
  referenceCurves = [],
  normalizationRegions,
  selectionTarget,
  onSelectionChange,
  peaks = [],
  selectedPeakId,
  onPeakUpdate,
  onPeakSelect,
  onPeakDelete,
  onPeakAdd,
  isManualPeakMode = false,
  differenceSpectra = [],
  showThetaData = false,
  showPhiData = false,
  selectedGeometry = null,
}: SpectrumPlotProps) {
  // Process spectrum data
  const groupedTraces = useSpectrumData(points, showThetaData, showPhiData, differenceSpectra);

  // Process reference and difference data
  const referenceData = useReferenceData(referenceCurves, differenceSpectra);

  // Process peak visualization
  const peakViz = usePeakVisualization(points, peaks, selectedPeakId, selectedGeometry);

  // Calculate data extents
  const extents = useDataExtents(points, differenceSpectra);

  // Calculate total legend items
  const totalLegendItems = useMemo(() => {
    return (
      groupedTraces.traces.length +
      (referenceCurves.length > 0 ? 1 : 0) +
      differenceSpectra.length
    );
  }, [groupedTraces.traces.length, referenceCurves.length, differenceSpectra.length]);

  // Generate layout
  const plotLayout = usePlotLayout(
    height,
    energyStats,
    absorptionStats,
    extents,
    points,
    peaks,
    selectedPeakId,
    normalizationRegions,
    selectionTarget,
    isManualPeakMode,
    referenceCurves,
    differenceSpectra,
    peakViz.hasPeakVisualization,
    totalLegendItems,
  );

  // Set up selection handlers
  const selection = useSelectionHandler(
    groupedTraces,
    groupedTraces.traces.length,
    onSelectionChange,
  );

  // Set up peak interactions
  const peakInteractions = usePeakInteractions(
    peaks,
    selectedPeakId,
    isManualPeakMode,
    onPeakAdd,
    onPeakSelect,
    onPeakDelete,
    onPeakUpdate,
    plotLayout.layout,
  );

  // Empty state
  if (points.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-6 text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-800/40 dark:text-gray-300">
        Upload a spectrum CSV to preview data.
      </div>
    );
  }

  return (
    <div
      ref={peakInteractions.plotRef}
      className="focus:ring-wsu-crimson/20 rounded-lg focus:ring-2 focus:ring-offset-2 focus:outline-none"
      onClick={() => {
        // Focus the container when clicked to enable keyboard events
        if (peakInteractions.plotRef.current instanceof HTMLElement) {
          peakInteractions.plotRef.current.focus();
        }
      }}
    >
      <Plot
        data={[
          ...groupedTraces.traces,
          ...referenceData.referenceTraces,
          ...referenceData.differenceTraces,
          ...(selectedGeometry && peakViz.selectedGeometryTrace
            ? [peakViz.selectedGeometryTrace, ...peakViz.peakTraces]
            : []),
        ]}
        layout={plotLayout.layout}
        config={
          {
            responsive: true,
            displaylogo: false,
            modeBarButtonsToRemove: [
              "zoomIn2d",
              "zoomOut2d",
              "select2d",
              "lasso2d",
            ],
            selectdirection: selectionTarget ? "h" : "any",
            toImageButtonOptions: {
              filename: "nexafs-spectrum",
            },
            editable: true,
          } as Record<string, unknown>
        }
        onSelected={selection.handleSelected as (event: unknown) => void}
        onDeselect={selection.handleDeselect}
        style={{ width: "100%", height }}
        useResizeHandler
      />
    </div>
  );
}
