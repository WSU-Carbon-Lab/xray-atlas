/**
 * Hook for peak visualization logic
 * Handles selected geometry filtering and peak trace generation
 */

import { useMemo } from "react";
import type { PlotData } from "plotly.js";
import type { SpectrumPoint, Peak } from "../core/types";
import { generateGaussianPeak } from "~/app/contribute/nexafs/utils";
import { filterPointsByGeometry, buildGeometryLabel } from "../utils/traceUtils";

export type PeakVisualizationResult = {
  selectedGeometryPoints: SpectrumPoint[] | null;
  peakTraces: PlotData[];
  selectedGeometryTrace: PlotData | null;
  hasPeakVisualization: boolean;
};

/**
 * Process peaks and selected geometry for visualization
 */
export function usePeakVisualization(
  points: SpectrumPoint[],
  peaks: Peak[],
  selectedPeakId: string | null,
  selectedGeometry: { theta?: number; phi?: number } | null,
): PeakVisualizationResult {
  // Filter points for selected geometry
  const selectedGeometryPoints = useMemo(() => {
    if (!selectedGeometry) return null;
    return filterPointsByGeometry(points, selectedGeometry);
  }, [points, selectedGeometry]);

  // Generate peak traces as Gaussian curves (excluding step peaks)
  const peakTraces = useMemo<PlotData[]>(() => {
    if (!selectedGeometry || !selectedGeometryPoints || peaks.length === 0) {
      return [];
    }

    // Filter out step peaks from visualization
    const nonStepPeaks = peaks.filter((peak) => !peak.isStep);
    if (nonStepPeaks.length === 0) {
      return [];
    }

    // Get energy range from selected geometry points
    if (selectedGeometryPoints.length === 0) return [];

    const energies = selectedGeometryPoints.map((p) => p.energy).sort((a, b) => a - b);
    const minEnergy = energies[0] ?? 0;
    const maxEnergy = energies[energies.length - 1] ?? 0;

    // Create a fine energy grid for smooth Gaussian curves
    const numPoints = Math.max(200, selectedGeometryPoints.length);
    const energyRange: number[] = [];
    for (let i = 0; i < numPoints; i++) {
      energyRange.push(minEnergy + (maxEnergy - minEnergy) * (i / (numPoints - 1)));
    }

    // Generate individual peak traces
    return nonStepPeaks.map((peak, peakIndex) => {
      const peakId =
        peak.id ?? `peak-${peakIndex}-${peak.energy}`;
      const isSelected = selectedPeakId === peakId;

      // Use default amplitude and width if not specified
      const amplitude = peak.amplitude ?? 1;
      const width = peak.width ?? 0.1;

      // Generate Gaussian curve
      const intensities = generateGaussianPeak(
        { energy: peak.energy, amplitude, width },
        energyRange,
      );

      return {
        type: "scattergl",
        mode: "lines",
        name: `Peak ${peakIndex + 1}`,
        x: energyRange,
        y: intensities,
        line: {
          color: isSelected ? "#a60f2d" : "#6b7280",
          width: isSelected ? 2 : 1.5,
          dash: "dash",
        },
        hovertemplate:
          `<b>Peak ${peakIndex + 1}</b><br>` +
          `Energy: ${peak.energy.toFixed(2)} eV<br>` +
          `Amplitude: ${amplitude.toFixed(3)}<br>` +
          `Width: ${width.toFixed(3)} eV` +
          "<extra></extra>",
        showlegend: false,
        xaxis: "x2",
        yaxis: "y2",
      } as PlotData;
    });
  }, [selectedGeometry, selectedGeometryPoints, peaks, selectedPeakId]);

  // Generate trace for selected geometry spectrum
  const selectedGeometryTrace = useMemo<PlotData | null>(() => {
    if (!selectedGeometry || !selectedGeometryPoints || selectedGeometryPoints.length === 0) {
      return null;
    }

    const energies = selectedGeometryPoints.map((p) => p.energy);
    const absorptions = selectedGeometryPoints.map((p) => p.absorption);

    const label = buildGeometryLabel(selectedGeometry.theta, selectedGeometry.phi) || "Selected Spectrum";

    return {
      type: "scattergl",
      mode: "lines+markers",
      name: label,
      x: energies,
      y: absorptions,
      marker: {
        color: "#d7263d",
        size: 4,
        opacity: 0.7,
      },
      line: {
        color: "#d7263d",
        width: 2,
      },
      hovertemplate:
        `<b>${label}</b><br>` +
        "Energy: %{x:.3f} eV<br>Intensity: %{y:.4f}" +
        "<extra></extra>",
      showlegend: false,
      xaxis: "x2",
      yaxis: "y2",
    } as PlotData;
  }, [selectedGeometry, selectedGeometryPoints]);

  const hasPeakVisualization =
    selectedGeometry !== null && selectedGeometryTrace !== null;

  return {
    selectedGeometryPoints,
    peakTraces,
    selectedGeometryTrace,
    hasPeakVisualization,
  };
}
