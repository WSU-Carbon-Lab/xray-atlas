import type { SpectrumPoint } from "~/app/components/plots/SpectrumPlot";
import type {
  ColumnStats,
  GeometryPair,
  SpectrumStats,
  BareAtomPoint,
} from "./types";

export const toNumber = (value: unknown): number => {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = parseFloat(value.trim());
    return Number.isFinite(parsed) ? parsed : Number.NaN;
  }
  return Number.NaN;
};

/**
 * Extract unique atom/element symbols from a chemical formula string.
 * Returns a Set of uppercase element symbols (e.g., "C", "N", "O", "Cl", "Fe").
 * This is a simplified client-side parser for validation purposes.
 * Handles formulas like: C6H12O6, H2O, NaCl, Fe2O3, etc.
 */
export const extractAtomsFromFormula = (formula: string): Set<string> => {
  const atoms = new Set<string>();
  if (!formula || typeof formula !== "string") {
    return atoms;
  }

  // Remove whitespace and common separators like dots (for hydrates)
  const cleaned = formula.trim().replace(/\s+/g, "").split(/[·.]/)[0];
  if (!cleaned) {
    return atoms;
  }

  // Match element symbols: uppercase letter followed by optional lowercase letter
  // Examples: C, N, O, Cl, Fe, Na, Mg, Al, Si, etc.
  // This pattern matches:
  // - [A-Z] - single uppercase letter (e.g., C, N, O)
  // - [a-z]? - optional lowercase letter (e.g., Cl, Fe, Na)
  // Element symbols are always: 1 uppercase, 0-1 lowercase
  const elementPattern = /[A-Z][a-z]?/g;
  let match: RegExpMatchArray | null;

  // Find all element symbols in the formula
  const matches = cleaned.match(elementPattern);
  if (matches) {
    for (const element of matches) {
      if (element) {
        // Normalize to ensure consistent casing
        atoms.add(
          element.charAt(0).toUpperCase() + element.slice(1).toLowerCase(),
        );
      }
    }
  }

  return atoms;
};

export const extractGeometryPairs = (points: SpectrumPoint[]): GeometryPair[] =>
  Array.from(
    new Map(
      points
        .filter(
          (
            point,
          ): point is Required<Pick<SpectrumPoint, "theta" | "phi">> &
            SpectrumPoint =>
            typeof point.theta === "number" &&
            Number.isFinite(point.theta) &&
            typeof point.phi === "number" &&
            Number.isFinite(point.phi),
        )
        .map((point) => {
          const key = `${point.theta}:${point.phi}`;
          return [key, { theta: point.theta, phi: point.phi }];
        }),
    ).values(),
  );

export const formatStatNumber = (value: number | null): string => {
  if (value === null || !Number.isFinite(value)) {
    return "—";
  }
  const abs = Math.abs(value);
  if (abs === 0) return "0";
  if (abs >= 10000) return value.toFixed(0);
  if (abs >= 1000) return value.toFixed(1);
  if (abs >= 100) return value.toFixed(2);
  if (abs >= 1) return value.toFixed(3);
  return value.toExponential(2);
};

export type NumericColumnReport = {
  sanitizedInvalidRows: number[];
};

export const analyzeNumericColumns = (
  rows: Record<string, unknown>[],
  columns: Set<string>,
): Record<string, NumericColumnReport> => {
  const reports: Record<string, NumericColumnReport> = {};

  columns.forEach((column) => {
    const invalidRows: number[] = [];

    rows.forEach((row, rowIndex) => {
      const rawValue = row[column];
      if (rawValue === undefined || rawValue === null || rawValue === "") {
        invalidRows.push(rowIndex);
        return;
      }

      const numericValue = toNumber(rawValue);
      if (!Number.isFinite(numericValue)) {
        invalidRows.push(rowIndex);
      }
    });

    reports[column] = { sanitizedInvalidRows: invalidRows };
  });

  return reports;
};

// BareAtomPoint is now defined in types.ts
// This type is kept for backward compatibility with existing code
export type BareAtomPointLegacy = {
  energyEv: number;
  mu: number;
};

export type NormalizationComputation = {
  normalizedPoints: SpectrumPoint[];
  scale: number;
  offset: number;
  preRange: [number, number] | null;
  postRange: [number, number] | null;
};

const interpolateBareMu = (
  barePoints: BareAtomPoint[],
  energy: number,
): number => {
  if (barePoints.length === 0) {
    return 0;
  }

  if (energy <= barePoints[0]!.energy) {
    return barePoints[0]!.absorption;
  }

  const last = barePoints[barePoints.length - 1]!;
  if (energy >= last.energy) {
    return last.absorption;
  }

  let left = 0;
  let right = barePoints.length - 1;

  while (right - left > 1) {
    const mid = Math.floor((left + right) / 2);
    if (barePoints[mid]!.energy > energy) {
      right = mid;
    } else {
      left = mid;
    }
  }

  const leftPoint = barePoints[left]!;
  const rightPoint = barePoints[right]!;
  const span = rightPoint.energy - leftPoint.energy;
  if (span === 0) {
    return leftPoint.absorption;
  }
  const t = (energy - leftPoint.energy) / span;
  return (
    leftPoint.absorption + t * (rightPoint.absorption - leftPoint.absorption)
  );
};

export const computeZeroOneNormalization = (
  points: SpectrumPoint[],
  preRange: [number, number] | null,
  postRange: [number, number] | null,
): NormalizationComputation | null => {
  if (points.length === 0 || !preRange || !postRange) {
    return null;
  }

  // Find points in pre-edge and post-edge regions
  const preEdgePoints = points.filter(
    (p) => p.energy >= preRange[0] && p.energy <= preRange[1],
  );
  const postEdgePoints = points.filter(
    (p) => p.energy >= postRange[0] && p.energy <= postRange[1],
  );

  if (preEdgePoints.length === 0 || postEdgePoints.length === 0) {
    return null;
  }

  // Calculate average absorption in each region
  const preAvg =
    preEdgePoints.reduce((sum, p) => sum + p.absorption, 0) /
    preEdgePoints.length;
  const postAvg =
    postEdgePoints.reduce((sum, p) => sum + p.absorption, 0) /
    postEdgePoints.length;

  // Avoid division by zero
  if (Math.abs(postAvg - preAvg) < 1e-10) {
    return null;
  }

  // Apply linear transformation: normalized = (value - preAvg) / (postAvg - preAvg)
  // This maps preAvg -> 0 and postAvg -> 1
  const scale = 1 / (postAvg - preAvg);
  const offset = -preAvg / (postAvg - preAvg);

  const normalizedPoints: SpectrumPoint[] = points.map((point) => ({
    ...point,
    absorption: scale * point.absorption + offset,
  }));

  return {
    normalizedPoints,
    scale,
    offset,
    preRange,
    postRange,
  };
};

export const computeNormalizationForExperiment = (
  points: SpectrumPoint[],
  barePoints: BareAtomPoint[],
  preEdgeCount: number,
  postEdgeCount: number,
): NormalizationComputation | null => {
  if (points.length === 0) {
    return null;
  }

  // Compute pre-edge and post-edge energy ranges from all points (before grouping)
  // This ensures we use the same energy ranges for all geometry groups
  const sortedPoints = [...points].sort((a, b) => a.energy - b.energy);
  const clampedPre = Math.max(0, Math.min(preEdgeCount, sortedPoints.length));
  const clampedPost = Math.max(0, Math.min(postEdgeCount, sortedPoints.length));

  const preRange: [number, number] | null =
    clampedPre > 0
      ? [
          sortedPoints[0]!.energy,
          sortedPoints[Math.min(clampedPre - 1, sortedPoints.length - 1)]!
            .energy,
        ]
      : null;
  const postRange: [number, number] | null =
    clampedPost > 0
      ? [
          sortedPoints[Math.max(sortedPoints.length - clampedPost, 0)]!.energy,
          sortedPoints[sortedPoints.length - 1]!.energy,
        ]
      : null;

  if (!preRange || !postRange) {
    return null;
  }

  // Helper function to compute normalization for a single group of points
  // using energy-based selection (not count-based)
  const computeNormalizationForGroup = (
    groupPoints: SpectrumPoint[],
    preEnergyRange: [number, number],
    postEnergyRange: [number, number],
  ): { scale: number; offset: number } | null => {
    if (groupPoints.length === 0) {
      return null;
    }

    // Select points within pre-edge and post-edge energy ranges
    const preEdgePoints = groupPoints.filter(
      (p) => p.energy >= preEnergyRange[0] && p.energy <= preEnergyRange[1],
    );
    const postEdgePoints = groupPoints.filter(
      (p) => p.energy >= postEnergyRange[0] && p.energy <= postEnergyRange[1],
    );

    if (preEdgePoints.length === 0 || postEdgePoints.length === 0) {
      return null;
    }

    // Combine pre-edge and post-edge points for the fit
    const selectedPoints = [...preEdgePoints, ...postEdgePoints];

    if (selectedPoints.length < 2) {
      return null;
    }

    const muValues = selectedPoints.map((point) =>
      interpolateBareMu(barePoints, point.energy),
    );

    let n = 0;
    let sumX = 0;
    let sumY = 0;
    let sumXX = 0;
    let sumXY = 0;

    selectedPoints.forEach((point, index) => {
      const intensity = point.absorption ?? 0;
      const mu = muValues[index] ?? 0;
      n += 1;
      sumX += intensity;
      sumY += mu;
      sumXX += intensity * intensity;
      sumXY += intensity * mu;
    });

    if (n < 2) {
      return null;
    }

    const denominator = n * sumXX - sumX * sumX;
    const scale =
      Math.abs(denominator) > 1e-12
        ? (n * sumXY - sumX * sumY) / denominator
        : 1;
    const offset = (sumY - scale * sumX) / n;

    if (!Number.isFinite(scale) || !Number.isFinite(offset)) {
      return null;
    }

    return { scale, offset };
  };

  // Group points by geometry (theta/phi pairs)
  // Points without geometry are grouped together as "no-geometry"
  type GeometryKey = string;
  const geometryGroups = new Map<GeometryKey, SpectrumPoint[]>();
  const pointToGeometryKey = new Map<number, GeometryKey>();

  points.forEach((point, index) => {
    const hasGeometry =
      typeof point.theta === "number" &&
      Number.isFinite(point.theta) &&
      typeof point.phi === "number" &&
      Number.isFinite(point.phi);

    const geometryKey: GeometryKey = hasGeometry
      ? `${point.theta}:${point.phi}`
      : "no-geometry";

    if (!geometryGroups.has(geometryKey)) {
      geometryGroups.set(geometryKey, []);
    }
    geometryGroups.get(geometryKey)!.push(point);
    pointToGeometryKey.set(index, geometryKey);
  });

  // Compute normalization factors for each geometry group
  // using the same pre/post edge energy ranges for all groups
  const geometryNormalizations = new Map<
    GeometryKey,
    { scale: number; offset: number }
  >();
  for (const [geometryKey, groupPoints] of geometryGroups.entries()) {
    const normalization = computeNormalizationForGroup(
      groupPoints,
      preRange,
      postRange,
    );
    if (normalization) {
      geometryNormalizations.set(geometryKey, normalization);
    } else {
      // If normalization fails for a group, we can't proceed
      return null;
    }
  }

  // Apply group-specific normalization to each point
  const normalizedPoints: SpectrumPoint[] = points.map((point, index) => {
    const geometryKey = pointToGeometryKey.get(index);
    if (!geometryKey) {
      return { ...point };
    }

    const normalization = geometryNormalizations.get(geometryKey);
    if (!normalization) {
      return { ...point };
    }

    return {
      ...point,
      absorption: normalization.scale * point.absorption + normalization.offset,
    };
  });

  // Compute aggregate scale and offset for return value (average across groups, weighted by point count)
  // This maintains backward compatibility with the return type
  let totalPoints = 0;
  let weightedScale = 0;
  let weightedOffset = 0;

  for (const [geometryKey, groupPoints] of geometryGroups.entries()) {
    const normalization = geometryNormalizations.get(geometryKey);
    if (normalization) {
      const groupSize = groupPoints.length;
      totalPoints += groupSize;
      weightedScale += normalization.scale * groupSize;
      weightedOffset += normalization.offset * groupSize;
    }
  }

  const aggregateScale = totalPoints > 0 ? weightedScale / totalPoints : 1;
  const aggregateOffset = totalPoints > 0 ? weightedOffset / totalPoints : 0;

  return {
    normalizedPoints,
    scale: aggregateScale,
    offset: aggregateOffset,
    preRange,
    postRange,
  };
};

export const rangesApproximatelyEqual = (
  a: [number, number] | null,
  b: [number, number] | null,
  tolerance = 1e-6,
) => {
  if (!a && !b) return true;
  if (!a || !b) return false;
  return (
    Math.abs(a[0] - b[0]) <= tolerance && Math.abs(a[1] - b[1]) <= tolerance
  );
};

export const countPointsWithinRange = (
  points: SpectrumPoint[],
  range: { min: number; max: number },
) =>
  points.filter(
    (point) => point.energy >= range.min && point.energy <= range.max,
  ).length;

export const buildSpectrumStats = (params: {
  totalRows: number;
  spectrumPoints: SpectrumPoint[];
  energyStats: ColumnStats;
  absorptionStats: ColumnStats;
  thetaStats?: ColumnStats;
  phiStats?: ColumnStats;
}): SpectrumStats => ({
  totalRows: params.totalRows,
  validPoints: params.spectrumPoints.length,
  energy: params.energyStats,
  absorption: params.absorptionStats,
  ...(params.thetaStats ? { theta: params.thetaStats } : {}),
  ...(params.phiStats ? { phi: params.phiStats } : {}),
});
