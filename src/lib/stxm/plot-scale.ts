import type { StxmPlotScaleMode } from "./stxm-region-types";

export type LineScanDisplayScale = {
  mode: StxmPlotScaleMode;
  vmin: number;
  vmax: number;
  logFloor: number;
};

export function percentileSorted(sorted: number[], p: number): number {
  if (sorted.length === 0) {
    return Number.NaN;
  }
  if (sorted.length === 1) {
    return sorted[0] ?? Number.NaN;
  }
  const fraction = p / 100;
  const index = fraction * (sorted.length - 1);
  const lo = Math.floor(index);
  const hi = Math.ceil(index);
  if (lo === hi) {
    return sorted[lo] ?? Number.NaN;
  }
  const weight = index - lo;
  return (sorted[lo] ?? 0) * (1 - weight) + (sorted[hi] ?? 0) * weight;
}

export function percentileLimits(
  values: number[] | number[][],
  fallbackMin: number,
  fallbackMax: number,
  pLow = 5,
  pHigh = 95,
): [number, number] {
  const flat = (Array.isArray(values[0])
    ? (values as number[][]).flat()
    : (values as number[])
  ).filter((value) => Number.isFinite(value));
  if (flat.length === 0) {
    return [fallbackMin, fallbackMax];
  }
  const sorted = [...flat].sort((a, b) => a - b);
  const vmin = percentileSorted(sorted, pLow);
  const vmax = percentileSorted(sorted, pHigh);
  if (!Number.isFinite(vmin) || !Number.isFinite(vmax) || vmin >= vmax) {
    return [fallbackMin, fallbackMax];
  }
  return [vmin, vmax];
}

function lineScanFinitePixels(image: number[][]): number[] {
  let finite = image.flat().filter((value) => Number.isFinite(value));
  const positive = finite.filter((value) => value > 0);
  if (positive.length >= Math.max(16, Math.floor(finite.length / 10))) {
    finite = positive;
  }
  return finite;
}

export function lineScanLogFloor(positiveValues: number[]): number {
  const positive = positiveValues.filter((value) => value > 0);
  if (positive.length === 0) {
    return 1;
  }
  const minPositive = Math.min(...positive);
  if (!Number.isFinite(minPositive) || minPositive <= 0) {
    return 1;
  }
  return Math.max(1, minPositive * 1e-3);
}

export function lineScanDisplayValue(
  value: number,
  mode: StxmPlotScaleMode,
  logFloor = 1,
): number {
  if (!Number.isFinite(value)) {
    return Number.NaN;
  }
  if (mode === "linear") {
    return value;
  }
  const clamped = value > 0 ? Math.max(value, logFloor) : logFloor;
  return Math.log10(clamped);
}

export function lineScanImageDisplayScale(
  image: number[][],
  fallbackMin: number,
  fallbackMax: number,
  scaleMode: StxmPlotScaleMode = "linear",
  pLow = 5,
  pHigh = 95,
): LineScanDisplayScale {
  const finite = lineScanFinitePixels(image);
  const positive = finite.filter((value) => value > 0);
  const logFloor = lineScanLogFloor(positive);
  if (finite.length === 0) {
    const fallbackVmin =
      scaleMode === "log"
        ? lineScanDisplayValue(Math.max(fallbackMin, logFloor), "log", logFloor)
        : fallbackMin;
    const fallbackVmax =
      scaleMode === "log"
        ? lineScanDisplayValue(Math.max(fallbackMax, logFloor), "log", logFloor)
        : fallbackMax;
    return { mode: scaleMode, vmin: fallbackVmin, vmax: fallbackVmax, logFloor };
  }
  const displayValues = finite.map((value) =>
    lineScanDisplayValue(value, scaleMode, logFloor),
  );
  const sorted = [...displayValues].sort((a, b) => a - b);
  let vmin = percentileSorted(sorted, pLow);
  let vmax = percentileSorted(sorted, pHigh);
  if (!Number.isFinite(vmin)) {
    vmin = sorted[0] ?? fallbackMin;
  }
  if (!Number.isFinite(vmax)) {
    vmax = sorted[sorted.length - 1] ?? fallbackMax;
  }
  if (!Number.isFinite(vmin) || !Number.isFinite(vmax)) {
    return {
      mode: scaleMode,
      vmin:
        scaleMode === "log"
          ? lineScanDisplayValue(fallbackMin, "log", logFloor)
          : fallbackMin,
      vmax:
        scaleMode === "log"
          ? lineScanDisplayValue(fallbackMax, "log", logFloor)
          : fallbackMax,
      logFloor,
    };
  }
  if (vmax <= vmin) {
    vmax = vmin + (scaleMode === "log" ? 0.25 : Math.max(Math.abs(vmin) * 1e-6, 1));
  }
  return { mode: scaleMode, vmin, vmax, logFloor };
}

export function lineScanPixelGray(
  value: number,
  scale: LineScanDisplayScale,
): number {
  const displayValue = lineScanDisplayValue(value, scale.mode, scale.logFloor);
  const unit = normalizeToUnit(displayValue, scale.vmin, scale.vmax);
  return Math.round(unit * 255);
}

export function qAxisValueToPx(
  value: number,
  qaxisPoints: number[],
  height: number,
): number {
  const qTop = qaxisPoints[0] ?? 0;
  const qBottom = qaxisPoints[qaxisPoints.length - 1] ?? 1;
  const qSpan = qTop - qBottom;
  if (!Number.isFinite(qSpan) || Math.abs(qSpan) < 1e-12) {
    return height / 2;
  }
  return ((qTop - value) / qSpan) * height;
}

export function pxToQAxisValue(
  clientY: number,
  canvasTop: number,
  canvasHeight: number,
  qaxisPoints: number[],
): number {
  const qTop = qaxisPoints[0] ?? 0;
  const qBottom = qaxisPoints[qaxisPoints.length - 1] ?? 1;
  const qSpan = qTop - qBottom;
  const ratio = canvasHeight > 0 ? (clientY - canvasTop) / canvasHeight : 0;
  return qTop - ratio * qSpan;
}

export function qAxisBounds(qaxisPoints: number[]): [number, number] {
  if (qaxisPoints.length === 0) {
    return [0, 1];
  }
  const lo = Math.min(...qaxisPoints);
  const hi = Math.max(...qaxisPoints);
  return lo <= hi ? [lo, hi] : [hi, lo];
}

export function computeRowSums(image: number[][]): number[] {
  return image.map((row) => {
    let sum = 0;
    for (const value of row) {
      sum += value;
    }
    return sum;
  });
}

export function normalizeToUnit(value: number, vmin: number, vmax: number): number {
  const span = vmax - vmin;
  if (!Number.isFinite(span) || span <= 0) {
    return 0;
  }
  return Math.min(1, Math.max(0, (value - vmin) / span));
}

export function rowSumTraceLimits(
  rowSums: number[],
  marginFraction = 0.05,
): [number, number] {
  const finite = rowSums.filter((value) => Number.isFinite(value));
  if (finite.length === 0) {
    return [0, 1];
  }
  const dataMin = Math.min(...finite);
  const dataMax = Math.max(...finite);
  if (!Number.isFinite(dataMin) || !Number.isFinite(dataMax)) {
    return [0, 1];
  }
  const span = dataMax - dataMin;
  if (!Number.isFinite(span) || span <= 0) {
    const pad = Math.max(Math.abs(dataMin) * marginFraction, 1);
    return [dataMin - pad, dataMax + pad];
  }
  const margin = span * marginFraction;
  return [dataMin - margin, dataMax + margin];
}

export function rowSumToTraceX(
  value: number,
  vmin: number,
  vmax: number,
  plotLeft: number,
  plotWidth: number,
  widthFraction = 1,
): number {
  const padding = (plotWidth * (1 - widthFraction)) / 2;
  const innerLeft = plotLeft + padding;
  const innerWidth = plotWidth * widthFraction;
  const t = normalizeToUnit(value, vmin, vmax);
  return innerLeft + (1 - t) * innerWidth;
}
