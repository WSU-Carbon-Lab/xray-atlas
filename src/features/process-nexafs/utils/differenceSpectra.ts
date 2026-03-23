import type { SpectrumPoint } from "~/components/plots/types";

export type DifferenceSpectrum = {
  label: string;
  points: SpectrumPoint[];
  preferred?: boolean;
  lowerAngle: number;
  higherAngle: number;
  mode: "theta" | "phi";
};

function interpolateToGrid(
  points: SpectrumPoint[],
  energyGrid: number[],
): number[] {
  if (points.length === 0) return energyGrid.map(() => 0);

  const sortedPoints = [...points].sort((a, b) => a.energy - b.energy);
  const absorptions: number[] = [];

  for (const energy of energyGrid) {
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
      absorptions.push(sortedPoints[0]!.absorption);
    } else if (upperIdx === -1) {
      absorptions.push(sortedPoints[sortedPoints.length - 1]!.absorption);
    } else if (lowerIdx === upperIdx) {
      absorptions.push(sortedPoints[lowerIdx]!.absorption);
    } else {
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

    if (!hasGeometry) continue;

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

export function calculateDifferenceSpectra(
  points: SpectrumPoint[],
  mode: "theta" | "phi",
): DifferenceSpectrum[] {
  const groups = groupByGeometry(points);

  if (groups.size < 2) {
    return [];
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

  for (let i = 0; i < geometries.length; i++) {
    for (let j = i + 1; j < geometries.length; j++) {
      const geom1 = geometries[i]!;
      const geom2 = geometries[j]!;

      let lower: (typeof geometries)[0];
      let higher: (typeof geometries)[0];
      let angleType: "theta" | "phi";

      if (mode === "theta") {
        if (geom1.theta < geom2.theta) {
          lower = geom1;
          higher = geom2;
        } else if (geom1.theta > geom2.theta) {
          lower = geom2;
          higher = geom1;
        } else {
          continue;
        }
        angleType = "theta";
      } else {
        if (geom1.phi < geom2.phi) {
          lower = geom1;
          higher = geom2;
        } else if (geom1.phi > geom2.phi) {
          lower = geom2;
          higher = geom1;
        } else {
          continue;
        }
        angleType = "phi";
      }

      const allEnergies = new Set<number>();
      lower.points.forEach((p) => allEnergies.add(p.energy));
      higher.points.forEach((p) => allEnergies.add(p.energy));
      const energyGrid = Array.from(allEnergies).sort((a, b) => a - b);

      if (energyGrid.length === 0) continue;

      const lowerAbsorptions = interpolateToGrid(lower.points, energyGrid);
      const higherAbsorptions = interpolateToGrid(higher.points, energyGrid);

      const rawDifferencePoints: SpectrumPoint[] = energyGrid.map(
        (energy, idx) => ({
          energy,
          absorption: -(higherAbsorptions[idx]! - lowerAbsorptions[idx]!),
          theta: higher.theta,
          phi: higher.phi,
        }),
      );

      const area = rawDifferencePoints.reduce((sum, point, idx) => {
        if (idx === 0) return 0;
        const prevPoint = rawDifferencePoints[idx - 1]!;
        const width = point.energy - prevPoint.energy;
        const avgAbsorption =
          (Math.abs(point.absorption) + Math.abs(prevPoint.absorption)) / 2;
        return sum + width * avgAbsorption;
      }, 0);

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
