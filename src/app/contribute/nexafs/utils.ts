import type { SpectrumPoint } from "~/app/components/plots/SpectrumPlot";
import type { ColumnStats, GeometryPair, SpectrumStats } from "./types";

export const toNumber = (value: unknown): number => {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = parseFloat(value.trim());
    return Number.isFinite(parsed) ? parsed : Number.NaN;
  }
  return Number.NaN;
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
          return [
            key,
            { theta: point.theta!, phi: point.phi! } as GeometryPair,
          ];
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

export type BareAtomPoint = {
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

  if (energy <= barePoints[0]!.energyEv) {
    return barePoints[0]!.mu;
  }

  const last = barePoints[barePoints.length - 1]!;
  if (energy >= last.energyEv) {
    return last.mu;
  }

  let left = 0;
  let right = barePoints.length - 1;

  while (right - left > 1) {
    const mid = Math.floor((left + right) / 2);
    if (barePoints[mid]!.energyEv > energy) {
      right = mid;
    } else {
      left = mid;
    }
  }

  const leftPoint = barePoints[left]!;
  const rightPoint = barePoints[right]!;
  const span = rightPoint.energyEv - leftPoint.energyEv;
  if (span === 0) {
    return leftPoint.mu;
  }
  const t = (energy - leftPoint.energyEv) / span;
  return leftPoint.mu + t * (rightPoint.mu - leftPoint.mu);
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

  const clampedPre = Math.max(0, Math.min(preEdgeCount, points.length));
  const clampedPost = Math.max(0, Math.min(postEdgeCount, points.length));

  const selectedIndices = new Set<number>();
  for (let idx = 0; idx < clampedPre; idx += 1) {
    selectedIndices.add(idx);
  }
  for (
    let idx = Math.max(points.length - clampedPost, 0);
    idx < points.length;
    idx += 1
  ) {
    selectedIndices.add(idx);
  }

  if (selectedIndices.size < 2) {
    for (let idx = 0; idx < Math.min(points.length, 2); idx += 1) {
      selectedIndices.add(idx);
    }
    if (selectedIndices.size < 2) {
      return null;
    }
  }

  const muValues = points.map((point) =>
    interpolateBareMu(barePoints, point.energy),
  );

  let n = 0;
  let sumX = 0;
  let sumY = 0;
  let sumXX = 0;
  let sumXY = 0;

  selectedIndices.forEach((index) => {
    const intensity = points[index]?.absorption ?? 0;
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
    Math.abs(denominator) > 1e-12 ? (n * sumXY - sumX * sumY) / denominator : 1;
  const offset = (sumY - scale * sumX) / n;

  if (!Number.isFinite(scale) || !Number.isFinite(offset)) {
    return null;
  }

  const normalizedPoints: SpectrumPoint[] = points.map((point) => ({
    ...point,
    absorption: scale * point.absorption + offset,
  }));

  const preRange: [number, number] | null =
    clampedPre > 0
      ? [
          points[0]!.energy,
          points[Math.min(clampedPre - 1, points.length - 1)]!.energy,
        ]
      : null;
  const postRange: [number, number] | null =
    clampedPost > 0
      ? [
          points[Math.max(points.length - clampedPost, 0)]!.energy,
          points[points.length - 1]!.energy,
        ]
      : null;

  return {
    normalizedPoints,
    scale,
    offset,
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

