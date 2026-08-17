import type { SpectrumPoint } from "~/components/plots/types";
import type {
  ColumnStats,
  GeometryPair,
  SpectrumStats,
  BareAtomPoint,
} from "../types";
import { spectrumGeometryKey } from "~/lib/nexafs/spectrum-geometry-key";

/** Degenerate jump / mean threshold shared by OD and bare-atom fits. */
const NORM_EPS = 1e-10;

export const toNumber = (value: unknown): number => {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = parseFloat(value.trim());
    return Number.isFinite(parsed) ? parsed : Number.NaN;
  }
  return Number.NaN;
};

export const extractAtomsFromFormula = (formula: string): Set<string> => {
  const atoms = new Set<string>();
  if (!formula || typeof formula !== "string") {
    return atoms;
  }

  const cleaned = formula.trim().replace(/\s+/g, "").split(/[·.]/)[0];
  if (!cleaned) {
    return atoms;
  }

  const elementPattern = /[A-Z][a-z]?/g;
  const matches = cleaned.match(elementPattern);
  if (matches) {
    for (const element of matches) {
      if (element) {
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
          const key = spectrumGeometryKey(point.theta, point.phi);
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

export const interpolateBareMu = (
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

/** Inclusive `[lo, hi]` energy window, or `null` when unset. */
function normalizeInclusiveRange(
  range: [number, number] | null,
): [number, number] | null {
  if (!range) {
    return null;
  }
  return [Math.min(range[0], range[1]), Math.max(range[0], range[1])];
}

type GeometryKey = string;

type GeometryGrouping = {
  geometryGroups: Map<GeometryKey, SpectrumPoint[]>;
  pointToGeometryKey: Map<number, GeometryKey>;
};

/**
 * Groups spectrum rows by ordered `(theta, phi)`, or `"no-geometry"` when either
 * angle is missing / non-finite.
 */
function groupPointsByGeometry(points: SpectrumPoint[]): GeometryGrouping {
  const geometryGroups = new Map<GeometryKey, SpectrumPoint[]>();
  const pointToGeometryKey = new Map<number, GeometryKey>();

  points.forEach((point, index) => {
    const theta = point.theta;
    const phi = point.phi;
    const hasGeometry =
      typeof theta === "number" &&
      Number.isFinite(theta) &&
      typeof phi === "number" &&
      Number.isFinite(phi);

    const geometryKey: GeometryKey = hasGeometry
      ? spectrumGeometryKey(theta, phi)
      : "no-geometry";

    if (!geometryGroups.has(geometryKey)) {
      geometryGroups.set(geometryKey, []);
    }
    geometryGroups.get(geometryKey)!.push(point);
    pointToGeometryKey.set(index, geometryKey);
  });

  return { geometryGroups, pointToGeometryKey };
}

/**
 * Filters points that participate in a normalization window fit. Requires
 * finite positive energy and finite absorption so OD and bare-atom membership match.
 */
function windowPoints(
  groupPoints: SpectrumPoint[],
  range: [number, number],
): SpectrumPoint[] {
  return groupPoints.filter(
    (p) =>
      Number.isFinite(p.energy) &&
      p.energy > 0 &&
      p.energy >= range[0] &&
      p.energy <= range[1] &&
      Number.isFinite(p.absorption),
  );
}

function meanAbsorption(groupPoints: SpectrumPoint[]): number | null {
  if (groupPoints.length === 0) {
    return null;
  }
  return (
    groupPoints.reduce((sum, p) => sum + p.absorption, 0) / groupPoints.length
  );
}

function medianAbs(values: number[]): number | null {
  if (values.length === 0) {
    return null;
  }
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1]! + sorted[mid]!) / 2;
  }
  return sorted[mid]!;
}

function applyAffineNormalization(
  points: SpectrumPoint[],
  pointToGeometryKey: Map<number, GeometryKey>,
  geometryNormalizations: Map<GeometryKey, { scale: number; offset: number }>,
): SpectrumPoint[] {
  return points.map((point, index) => {
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
}

function weightedAggregateTelemetry(
  geometryGroups: Map<GeometryKey, SpectrumPoint[]>,
  geometryNormalizations: Map<GeometryKey, { scale: number; offset: number }>,
): { scale: number; offset: number } {
  let totalPoints = 0;
  let weightedScale = 0;
  let weightedOffset = 0;
  for (const [geometryKey, groupPoints] of geometryGroups.entries()) {
    const normalization = geometryNormalizations.get(geometryKey);
    if (!normalization) {
      continue;
    }
    const groupSize = groupPoints.length;
    totalPoints += groupSize;
    weightedScale += normalization.scale * groupSize;
    weightedOffset += normalization.offset * groupSize;
  }
  return {
    scale: totalPoints > 0 ? weightedScale / totalPoints : 1,
    offset: totalPoints > 0 ? weightedOffset / totalPoints : 0,
  };
}

/**
 * Computes stable-monitor (zero-one) normalization without inverting spectra.
 *
 * - **Both windows:** shared positive `scale` from the median |post − pre| jump across
 *   geometries, with a **per-geometry** offset that maps each pre-edge average to `0`.
 *   Using one scale for all angles preserves relative dichroism; a negative
 *   `(post − pre)` never flips the trace (scale stays positive).
 * - **Pre only:** subtracts each geometry’s pre-edge average (`scale = 1`).
 * - **Post only:** shared positive `scale = 1 / median(|post|)` with `offset = 0`
 *   (telemetry aggregate; not an independent per-geometry map-to-1).
 *
 * Windows are **inclusive** and may be supplied in either order. Points are grouped by
 * `(theta, phi)`. Aggregate `scale`/`offset` are for telemetry (shared scale and
 * point-count-weighted mean offset).
 *
 * Returns `null` when `points` is empty, both windows are missing, or every geometry
 * fails to fit (empty window samples or a degenerate jump).
 *
 * @param points Spectrum samples; shared scale and per-geometry offsets are applied.
 * @param preRange Inclusive `[energyMin, energyMax]` pre-edge window, or `null` for post-only.
 * @param postRange Inclusive `[energyMin, energyMax]` post-edge window, or `null` for pre-only.
 */
export const computeZeroOneNormalization = (
  points: SpectrumPoint[],
  preRange: [number, number] | null,
  postRange: [number, number] | null,
): NormalizationComputation | null => {
  if (points.length === 0) {
    return null;
  }
  if (!preRange && !postRange) {
    return null;
  }

  const normalizedPreRange = normalizeInclusiveRange(preRange);
  const normalizedPostRange = normalizeInclusiveRange(postRange);
  const { geometryGroups, pointToGeometryKey } = groupPointsByGeometry(points);

  const geometryNormalizations = new Map<
    GeometryKey,
    { scale: number; offset: number }
  >();

  if (normalizedPreRange && normalizedPostRange) {
    const preAvgs = new Map<GeometryKey, number>();
    const jumps: number[] = [];

    for (const [geometryKey, groupPoints] of geometryGroups.entries()) {
      const preAvg = meanAbsorption(
        windowPoints(groupPoints, normalizedPreRange),
      );
      const postAvg = meanAbsorption(
        windowPoints(groupPoints, normalizedPostRange),
      );
      if (preAvg == null || postAvg == null) {
        continue;
      }
      const jump = postAvg - preAvg;
      if (Math.abs(jump) < NORM_EPS) {
        continue;
      }
      preAvgs.set(geometryKey, preAvg);
      jumps.push(jump);
    }

    const medianJumpAbs = medianAbs(jumps.map((j) => Math.abs(j)));
    if (medianJumpAbs == null || medianJumpAbs < NORM_EPS) {
      return null;
    }

    const scale = 1 / medianJumpAbs;
    if (!Number.isFinite(scale)) {
      return null;
    }

    for (const [geometryKey, preAvg] of preAvgs.entries()) {
      const offset = -preAvg * scale;
      if (!Number.isFinite(offset)) {
        continue;
      }
      geometryNormalizations.set(geometryKey, { scale, offset });
    }
  } else if (normalizedPreRange) {
    for (const [geometryKey, groupPoints] of geometryGroups.entries()) {
      const preAvg = meanAbsorption(
        windowPoints(groupPoints, normalizedPreRange),
      );
      if (preAvg == null) {
        continue;
      }
      geometryNormalizations.set(geometryKey, { scale: 1, offset: -preAvg });
    }
  } else if (normalizedPostRange) {
    const postAvgs = new Map<GeometryKey, number>();
    const absPosts: number[] = [];
    for (const [geometryKey, groupPoints] of geometryGroups.entries()) {
      const postAvg = meanAbsorption(
        windowPoints(groupPoints, normalizedPostRange),
      );
      if (postAvg == null || Math.abs(postAvg) < NORM_EPS) {
        continue;
      }
      postAvgs.set(geometryKey, postAvg);
      absPosts.push(Math.abs(postAvg));
    }
    const medianPostAbs = medianAbs(absPosts);
    if (medianPostAbs == null || medianPostAbs < NORM_EPS) {
      return null;
    }
    const scale = 1 / medianPostAbs;
    for (const geometryKey of postAvgs.keys()) {
      geometryNormalizations.set(geometryKey, { scale, offset: 0 });
    }
  }

  if (geometryNormalizations.size === 0) {
    return null;
  }

  const telemetry = weightedAggregateTelemetry(
    geometryGroups,
    geometryNormalizations,
  );

  return {
    normalizedPoints: applyAffineNormalization(
      points,
      pointToGeometryKey,
      geometryNormalizations,
    ),
    scale: telemetry.scale,
    offset: telemetry.offset,
    preRange: normalizedPreRange,
    postRange: normalizedPostRange,
  };
};

/**
 * Fits a per-geometry affine transform (scale, offset) that maps experimental absorption onto
 * tabulated bare-atom absorption within the contributor-selected energy windows.
 *
 * Scale is always **positive** so NEXAFS fine structure never flips relative to the continuum
 * (same policy as {@link computeZeroOneNormalization}).
 *
 * - **Both windows:** two-point mean match: `|postBare − preBare| / |postExp − preExp|`, with
 *   offset from the pre-edge means.
 * - **Pre or post only:** match the window mean intensity onto the mean bare-atom μ with
 *   `scale = |mean(μ) / mean(I)|` and `offset = mean(μ) − scale · mean(I)`. A free least-squares
 *   slope on a narrow continuum band often anti-correlates with the Henke slope and would flip
 *   the whole spectrum.
 *
 * Windows are **inclusive** and may be ordered either way. Points are grouped by `(theta, phi)`
 * so each polarization geometry receives its own transform; aggregate `scale`/`offset` are
 * point-count-weighted averages for telemetry / display only.
 *
 * Returns `null` when:
 *   - `points` is empty;
 *   - both windows are `null`; or
 *   - every geometry group fails to fit (empty window samples or degenerate jump / mean).
 *
 * Geometries that cannot be fit are left unscaled; successful groups still receive
 * their own `(scale, offset)`.
 *
 * @param points Spectrum samples; caller order is preserved on the returned points.
 * @param barePoints Bare-atom (or analogous reference) absorption curve, sorted by energy.
 * @param preRange Inclusive pre-edge window, or `null` for post-only.
 * @param postRange Inclusive post-edge window, or `null` for pre-only.
 */
export const computeNormalizationForExperiment = (
  points: SpectrumPoint[],
  barePoints: BareAtomPoint[],
  preRange: [number, number] | null,
  postRange: [number, number] | null,
): NormalizationComputation | null => {
  if (points.length === 0 || (!preRange && !postRange)) {
    return null;
  }

  const normalizedPreRange = normalizeInclusiveRange(preRange);
  const normalizedPostRange = normalizeInclusiveRange(postRange);

  const computeNormalizationForGroup = (
    groupPoints: SpectrumPoint[],
    preEnergyRange: [number, number] | null,
    postEnergyRange: [number, number] | null,
  ): { scale: number; offset: number } | null => {
    if (groupPoints.length === 0) {
      return null;
    }

    const preEdgePoints =
      preEnergyRange == null ? [] : windowPoints(groupPoints, preEnergyRange);
    const postEdgePoints =
      postEnergyRange == null ? [] : windowPoints(groupPoints, postEnergyRange);

    if (preEnergyRange != null && preEdgePoints.length === 0) {
      return null;
    }
    if (postEnergyRange != null && postEdgePoints.length === 0) {
      return null;
    }

    if (preEnergyRange != null && postEnergyRange != null) {
      const preExp = meanAbsorption(preEdgePoints);
      const postExp = meanAbsorption(postEdgePoints);
      if (preExp == null || postExp == null) {
        return null;
      }
      const preBare =
        preEdgePoints.reduce(
          (sum, p) => sum + interpolateBareMu(barePoints, p.energy),
          0,
        ) / preEdgePoints.length;
      const postBare =
        postEdgePoints.reduce(
          (sum, p) => sum + interpolateBareMu(barePoints, p.energy),
          0,
        ) / postEdgePoints.length;
      const expJump = postExp - preExp;
      const bareJump = postBare - preBare;
      if (Math.abs(expJump) < NORM_EPS || Math.abs(bareJump) < NORM_EPS) {
        return null;
      }
      const scale = Math.abs(bareJump) / Math.abs(expJump);
      const offset = preBare - scale * preExp;
      if (!Number.isFinite(scale) || !Number.isFinite(offset) || !(scale > 0)) {
        return null;
      }
      return { scale, offset };
    }

    const selectedPoints = [...preEdgePoints, ...postEdgePoints];
    if (selectedPoints.length < 1) {
      return null;
    }

    const meanIntensity = meanAbsorption(selectedPoints);
    if (meanIntensity == null || Math.abs(meanIntensity) < 1e-12) {
      return null;
    }
    const meanBare =
      selectedPoints.reduce(
        (sum, point) => sum + interpolateBareMu(barePoints, point.energy),
        0,
      ) / selectedPoints.length;

    const scale = Math.abs(meanBare / meanIntensity);
    const offset = meanBare - scale * meanIntensity;

    if (!Number.isFinite(scale) || !Number.isFinite(offset) || !(scale > 0)) {
      return null;
    }

    return { scale, offset };
  };

  const { geometryGroups, pointToGeometryKey } = groupPointsByGeometry(points);

  const geometryNormalizations = new Map<
    GeometryKey,
    { scale: number; offset: number }
  >();
  for (const [geometryKey, groupPoints] of geometryGroups.entries()) {
    const normalization = computeNormalizationForGroup(
      groupPoints,
      normalizedPreRange,
      normalizedPostRange,
    );
    if (normalization) {
      geometryNormalizations.set(geometryKey, normalization);
    }
  }

  if (geometryNormalizations.size === 0) {
    return null;
  }

  const telemetry = weightedAggregateTelemetry(
    geometryGroups,
    geometryNormalizations,
  );

  return {
    normalizedPoints: applyAffineNormalization(
      points,
      pointToGeometryKey,
      geometryNormalizations,
    ),
    scale: telemetry.scale,
    offset: telemetry.offset,
    preRange: normalizedPreRange,
    postRange: normalizedPostRange,
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
