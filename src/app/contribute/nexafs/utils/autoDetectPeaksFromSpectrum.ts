import type { SpectrumPoint } from "~/components/plots/types";
import type { PeakData } from "~/app/contribute/nexafs/types";
import { detectPeaks, convertToPeakData } from "./peakDetection";

export type SelectedGeometry = { theta?: number; phi?: number } | null;

export function filterSpectrumPointsByGeometry(
  points: SpectrumPoint[],
  selectedGeometry: SelectedGeometry,
): SpectrumPoint[] {
  if (!selectedGeometry) return points;
  return points.filter((point) => {
    const hasGeometry =
      typeof point.theta === "number" &&
      Number.isFinite(point.theta) &&
      typeof point.phi === "number" &&
      Number.isFinite(point.phi);

    if (!hasGeometry) {
      return (
        selectedGeometry.theta === undefined &&
        selectedGeometry.phi === undefined
      );
    }

    const thetaMatch =
      selectedGeometry.theta === undefined ||
      (typeof point.theta === "number" &&
        Number.isFinite(point.theta) &&
        Math.abs(point.theta - selectedGeometry.theta) < 0.01);
    const phiMatch =
      selectedGeometry.phi === undefined ||
      (typeof point.phi === "number" &&
        Number.isFinite(point.phi) &&
        Math.abs(point.phi - selectedGeometry.phi) < 0.01);

    return thetaMatch && phiMatch;
  });
}

function amplitudeAtNearestEnergy(
  energy: number,
  points: SpectrumPoint[],
): number | undefined {
  if (points.length === 0) return undefined;
  let closest = points[0]!;
  let minD = Math.abs(points[0]!.energy - energy);
  for (const p of points) {
    const d = Math.abs(p.energy - energy);
    if (d < minD) {
      minD = d;
      closest = p;
    }
  }
  return closest.absorption;
}

function sortPeaksByEnergy(peaksToSort: PeakData[]): PeakData[] {
  return [...peaksToSort].sort((a, b) => {
    if (a.isStep && !b.isStep) return -1;
    if (!a.isStep && b.isStep) return 1;
    return a.energy - b.energy;
  });
}

export function buildAutoDetectedPeakList(
  filteredPoints: SpectrumPoint[],
  options: { minProminence?: number } = {},
): PeakData[] {
  if (filteredPoints.length === 0) return [];
  const detected = detectPeaks(filteredPoints, options);
  const base = convertToPeakData(detected);
  const t = Date.now();
  return base.map((peak, index) => ({
    ...peak,
    amplitude: amplitudeAtNearestEnergy(peak.energy, filteredPoints),
    id: `peak-auto-${t}-${index}`,
  }));
}

export function mergePeaksPreservingManualAndSteps(
  existingPeaks: PeakData[],
  newAutoPeaks: PeakData[],
): PeakData[] {
  const stepPeaks = existingPeaks.filter((p) => p.isStep);
  const manualPeaks = existingPeaks.filter(
    (p) =>
      !p.isStep &&
      !(
        typeof p.id === "string" && p.id.startsWith("peak-auto-")
      ),
  );
  return sortPeaksByEnergy([...stepPeaks, ...manualPeaks, ...newAutoPeaks]);
}
