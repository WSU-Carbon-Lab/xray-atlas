import type { SpectrumPoint } from "~/app/components/plots/SpectrumPlot";

export type DifferenceSpectrum = {
  label: string;
  points: SpectrumPoint[];
  preferred?: boolean;
  lowerAngle: number;
  higherAngle: number;
  mode: "theta" | "phi";
};

/**
 * Interpolate spectrum points to a common energy grid
 */
function interpolateToGrid(
  points: SpectrumPoint[],
  energyGrid: number[],
): number[] {
  if (points.length === 0) return energyGrid.map(() => 0);

  const sortedPoints = [...points].sort((a, b) => a.energy - b.energy);
  const absorptions: number[] = [];

  for (const energy of energyGrid) {
    // Find the two points that bracket this energy
    let lowerIdx = -1;
    let upperIdx = -1;

    for (let i = 0; i < sortedPoints.length; i++) {
      if (sortedPoints[i]!.energy <= energy) {
        lowerIdx = i;
      }
      if (sortedPoints[i]!.energy >= energy && upperIdx === -1) {
        upperIdx = i;
        break;
      }
    }

    if (lowerIdx === -1) {
      // Extrapolate from first point
      absorptions.push(sortedPoints[0]!.absorption);
    } else if (upperIdx === -1) {
      // Extrapolate from last point
      absorptions.push(sortedPoints[sortedPoints.length - 1]!.absorption);
    } else if (lowerIdx === upperIdx) {
      // Exact match
      absorptions.push(sortedPoints[lowerIdx]!.absorption);
    } else {
      // Linear interpolation
      const lower = sortedPoints[lowerIdx]!;
      const upper = sortedPoints[upperIdx]!;
      const t = (energy - lower.energy) / (upper.energy - lower.energy);
      absorptions.push(
        lower.absorption + t * (upper.absorption - lower.absorption),
      );
    }
  }

  return absorptions;
}

/**
 * Group spectrum points by geometry (theta/phi pairs)
 */
function groupByGeometry(
  points: SpectrumPoint[],
): Map<string, SpectrumPoint[]> {
  const groups = new Map<string, SpectrumPoint[]>();

  for (const point of points) {
    const hasGeometry =
      typeof point.theta === "number" &&
      Number.isFinite(point.theta) &&
      typeof point.phi === "number" &&
      Number.isFinite(point.phi);

    if (!hasGeometry) {
      continue; // Skip points without geometry
    }

    const key = `${point.theta}:${point.phi}`;
    const group = groups.get(key);
    if (group) {
      group.push(point);
    } else {
      groups.set(key, [point]);
    }
  }

  return groups;
}

/**
 * Calculate difference spectra for pairs of incident angles
 * @param points - Spectrum points with geometry information
 * @param mode - 'theta' for polar difference spectra, 'phi' for azimuthal
 * @returns Array of difference spectrum objects
 */
export function calculateDifferenceSpectra(
  points: SpectrumPoint[],
  mode: "theta" | "phi",
): DifferenceSpectrum[] {
  const groups = groupByGeometry(points);

  if (groups.size < 2) {
    return []; // Need at least 2 geometries to calculate differences
  }

  const geometries = Array.from(groups.entries()).map(([key, groupPoints]) => {
    const [thetaStr, phiStr] = key.split(":");
    const theta = parseFloat(thetaStr ?? "0");
    const phi = parseFloat(phiStr ?? "0");
    return {
      key,
      theta,
      phi,
      points: groupPoints.sort((a, b) => a.energy - b.energy),
    };
  });

  const differences: DifferenceSpectrum[] = [];

  // Create all pairs where one angle is higher than the other
  for (let i = 0; i < geometries.length; i++) {
    for (let j = i + 1; j < geometries.length; j++) {
      const geom1 = geometries[i]!;
      const geom2 = geometries[j]!;

      // Determine which is higher based on mode
      let lower: typeof geom1;
      let higher: typeof geom1;
      let angleType: "theta" | "phi";

      if (mode === "theta") {
        if (geom1.theta < geom2.theta) {
          lower = geom1;
          higher = geom2;
        } else if (geom1.theta > geom2.theta) {
          lower = geom2;
          higher = geom1;
        } else {
          continue; // Same theta, skip
        }
        angleType = "theta";
      } else {
        // mode === "phi"
        if (geom1.phi < geom2.phi) {
          lower = geom1;
          higher = geom2;
        } else if (geom1.phi > geom2.phi) {
          lower = geom2;
          higher = geom1;
        } else {
          continue; // Same phi, skip
        }
        angleType = "phi";
      }

      // Create common energy grid from union of both spectra
      const allEnergies = new Set<number>();
      lower.points.forEach((p) => allEnergies.add(p.energy));
      higher.points.forEach((p) => allEnergies.add(p.energy));
      const energyGrid = Array.from(allEnergies).sort((a, b) => a - b);

      if (energyGrid.length === 0) {
        continue;
      }

      // Interpolate both spectra to common grid
      const lowerAbsorptions = interpolateToGrid(lower.points, energyGrid);
      const higherAbsorptions = interpolateToGrid(higher.points, energyGrid);

      // Calculate difference: higher - lower
      const rawDifferencePoints: SpectrumPoint[] = energyGrid.map(
        (energy, idx) => ({
          energy,
          absorption: -(higherAbsorptions[idx]! - lowerAbsorptions[idx]!),
          // Preserve geometry info from higher angle
          theta: higher.theta,
          phi: higher.phi,
        }),
      );

      // Normalize by total area (integral under the curve)
      const area = rawDifferencePoints.reduce((sum, point, idx) => {
        if (idx === 0) return 0;
        const prevPoint = rawDifferencePoints[idx - 1]!;
        const width = point.energy - prevPoint.energy;
        const avgAbsorption =
          (Math.abs(point.absorption) + Math.abs(prevPoint.absorption)) / 2;
        return sum + width * avgAbsorption;
      }, 0);

      // Normalize points by dividing by area (avoid division by zero)
      const differencePoints: SpectrumPoint[] =
        area > 0
          ? rawDifferencePoints.map((point) => ({
              ...point,
              absorption: point.absorption / area,
            }))
          : rawDifferencePoints;

      const lowerAngle = angleType === "theta" ? lower.theta : lower.phi;
      const higherAngle = angleType === "theta" ? higher.theta : higher.phi;

      const label =
        mode === "theta"
          ? `Δθ: ${lowerAngle.toFixed(1)}° → ${higherAngle.toFixed(1)}° (φ=${lower.phi.toFixed(1)}°)`
          : `Δφ: ${lowerAngle.toFixed(1)}° → ${higherAngle.toFixed(1)}° (θ=${lower.theta.toFixed(1)}°)`;

      differences.push({
        label,
        points: differencePoints,
        preferred: false,
        lowerAngle,
        higherAngle,
        mode,
      });
    }
  }

  return differences;
}
