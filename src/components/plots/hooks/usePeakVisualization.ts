/**
 * Hook for peak visualization logic
 * Handles selected geometry filtering and peak trace generation
 */

import { useMemo } from "react";
import type { TraceData, SpectrumPoint, Peak } from "../types";
import { generateGaussianPeak } from "~/app/contribute/nexafs/utils";
import { filterPointsByGeometry, buildGeometryLabel } from "../utils/trace-utils";
import { peakStableId } from "../utils/peakStableId";

export type PeakVisualizationResult = {
  selectedGeometryPoints: SpectrumPoint[] | null;
  peakTraces: TraceData[];
  selectedGeometryTrace: TraceData | null;
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
  const peakTraces = useMemo<TraceData[]>(() => {
    if (!selectedGeometry || !selectedGeometryPoints || peaks.length === 0) {
      return [];
    }

    const hasRenderable = peaks.some((p) => !p.isStep);
    if (!hasRenderable) {
      return [];
    }

    if (selectedGeometryPoints.length === 0) return [];

    const energies = selectedGeometryPoints.map((p) => p.energy).sort((a, b) => a - b);
    const minEnergy = energies[0] ?? 0;
    const maxEnergy = energies[energies.length - 1] ?? 0;

    const numPoints = Math.max(200, selectedGeometryPoints.length);
    const energyRange: number[] = [];
    for (let i = 0; i < numPoints; i++) {
      energyRange.push(minEnergy + (maxEnergy - minEnergy) * (i / (numPoints - 1)));
    }

    const out: TraceData[] = [];
    let displayIndex = 0;
    for (let peakIndex = 0; peakIndex < peaks.length; peakIndex++) {
      const peak = peaks[peakIndex]!;
      if (peak.isStep) continue;
      const peakId = peakStableId(peak, peakIndex);
      const isSelected = selectedPeakId === peakId;
      displayIndex += 1;

      const amplitude = peak.amplitude ?? 1;
      const width = peak.width ?? 0.1;

      const intensities = generateGaussianPeak(
        { energy: peak.energy, amplitude, width },
        energyRange,
      );

      out.push({
        type: "scattergl",
        mode: "lines",
        name: `Peak ${displayIndex}`,
        x: energyRange,
        y: intensities,
        line: {
          color: isSelected ? "#a60f2d" : "#6b7280",
          width: isSelected ? 2 : 1.5,
          dash: "dash",
        },
        hovertemplate:
          `<b>Peak ${displayIndex}</b><br>` +
          `Energy: ${peak.energy.toFixed(2)} eV<br>` +
          `Amplitude: ${amplitude.toFixed(3)}<br>` +
          `Width: ${width.toFixed(3)} eV` +
          "<extra></extra>",
        showlegend: false,
        xaxis: "x2",
        yaxis: "y2",
      });
    }
    return out;
  }, [selectedGeometry, selectedGeometryPoints, peaks, selectedPeakId]);

  // Generate trace for selected geometry spectrum
  const selectedGeometryTrace = useMemo<TraceData | null>(() => {
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
    };
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
