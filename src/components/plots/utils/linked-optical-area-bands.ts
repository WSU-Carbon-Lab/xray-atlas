import type { TraceData } from "../types";

export type LinkedOpticalAreaBandPoint = {
  readonly x: number;
  readonly y0: number;
  readonly y1: number;
};

/** One geometry's filled region between imaginary and real linked traces. */
export type LinkedOpticalAreaBand = {
  readonly geometryKey: string;
  readonly color: string;
  readonly points: readonly LinkedOpticalAreaBandPoint[];
};

export const OPTICAL_LINK_IMAGINARY_PREFIX = "link-imaginary-";
export const OPTICAL_LINK_REAL_PREFIX = "link-real-";

const LINKED_IMAGINARY_PREFIX = OPTICAL_LINK_IMAGINARY_PREFIX;
const LINKED_REAL_PREFIX = OPTICAL_LINK_REAL_PREFIX;

/**
 * Returns true when the trace belongs to a linked imaginary/real geometry pair
 * (primary or companion overlay).
 */
export function isLinkedOpticalSpectrumTrace(trace: TraceData): boolean {
  const id = trace.legendId;
  if (typeof id !== "string") {
    return false;
  }
  return (
    id.startsWith(LINKED_IMAGINARY_PREFIX) || id.startsWith(LINKED_REAL_PREFIX)
  );
}

function finitePoint(
  x: number | undefined,
  y0: number | undefined,
  y1: number | undefined,
): LinkedOpticalAreaBandPoint | null {
  if (
    typeof x === "number" &&
    typeof y0 === "number" &&
    typeof y1 === "number" &&
    Number.isFinite(x) &&
    Number.isFinite(y0) &&
    Number.isFinite(y1)
  ) {
    return { x, y0, y1 };
  }
  return null;
}

function zipTracesByIndex(
  primary: TraceData,
  companion: TraceData,
): LinkedOpticalAreaBandPoint[] {
  const xPrimary = primary.x;
  const yPrimary = primary.y;
  const xCompanion = companion.x;
  const yCompanion = companion.y;
  if (
    !Array.isArray(xPrimary) ||
    !Array.isArray(yPrimary) ||
    !Array.isArray(xCompanion) ||
    !Array.isArray(yCompanion)
  ) {
    return [];
  }
  if (
    xPrimary.length !== yPrimary.length ||
    xCompanion.length !== yCompanion.length
  ) {
    return [];
  }
  const len = Math.min(
    xPrimary.length,
    yPrimary.length,
    xCompanion.length,
    yCompanion.length,
  );
  const points: LinkedOpticalAreaBandPoint[] = [];
  for (let i = 0; i < len; i += 1) {
    const point = finitePoint(xPrimary[i], yPrimary[i], yCompanion[i]);
    if (point) {
      points.push(point);
    }
  }
  return points;
}

function geometryKeyFromLinkedLegendId(legendId: string | undefined): string {
  if (typeof legendId !== "string") {
    return "";
  }
  if (legendId.startsWith(LINKED_IMAGINARY_PREFIX)) {
    return legendId.slice(LINKED_IMAGINARY_PREFIX.length);
  }
  if (legendId.startsWith(LINKED_REAL_PREFIX)) {
    return legendId.slice(LINKED_REAL_PREFIX.length);
  }
  return "";
}

/**
 * Builds per-geometry area bands between aligned primary and companion linked traces.
 * Zips by trace index (same order as geometry keys from link builder).
 */
export function buildLinkedOpticalAreaBands(
  primaryTraces: readonly TraceData[],
  companionTraces: readonly TraceData[],
): LinkedOpticalAreaBand[] {
  const bands: LinkedOpticalAreaBand[] = [];
  const pairCount = Math.min(primaryTraces.length, companionTraces.length);
  for (let index = 0; index < pairCount; index += 1) {
    const primary = primaryTraces[index];
    const companion = companionTraces[index];
    if (!primary || !companion) {
      continue;
    }
    const points = zipTracesByIndex(primary, companion);
    if (points.length === 0) {
      continue;
    }
    const color =
      primary.line?.color ?? primary.marker?.color ?? "#6b7280";
    const geometryKey =
      geometryKeyFromLinkedLegendId(primary.legendId) ||
      geometryKeyFromLinkedLegendId(companion.legendId) ||
      `idx-${index}`;
    bands.push({ geometryKey, color, points });
  }
  return bands;
}
