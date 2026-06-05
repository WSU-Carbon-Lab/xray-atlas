/**
 * Clamps a spectrum axis zoom domain to data bounds while enforcing a minimum visible span.
 */
export function clampSpectrumAxisDomain(
  domain: [number, number],
  dataBounds: [number, number],
  minSpan: number,
): [number, number] {
  const lo = Math.min(domain[0], domain[1]);
  const hi = Math.max(domain[0], domain[1]);
  const span = hi - lo;
  if (span >= minSpan) {
    const clampedLo = Math.max(dataBounds[0], lo);
    const clampedHi = Math.min(dataBounds[1], hi);
    if (clampedHi - clampedLo >= minSpan) {
      return [clampedLo, clampedHi];
    }
  }
  const center = (lo + hi) / 2;
  const half = minSpan / 2;
  return [
    Math.max(dataBounds[0], center - half),
    Math.min(dataBounds[1], center + half),
  ];
}

/**
 * Minimum zoom window as a fraction of the full data span, with an absolute floor for degenerate ranges.
 */
export function spectrumAxisMinZoomSpan(
  dataBounds: [number, number],
  relativeFraction: number,
  absoluteFloor: number,
): number {
  const fullSpan = Math.abs(dataBounds[1] - dataBounds[0]);
  return Math.max(fullSpan * relativeFraction, absoluteFloor);
}

/**
 * Applies a wheel-driven multiplicative zoom on one axis, keeping the data value under `anchor` fixed.
 */
export function wheelZoomAxisDomain(
  currentDomain: [number, number],
  dataBounds: [number, number],
  minSpan: number,
  anchor: number,
  deltaY: number,
  zoomFactorPerStep = 1.1,
): [number, number] | null {
  const lo = Math.min(currentDomain[0], currentDomain[1]);
  const hi = Math.max(currentDomain[0], currentDomain[1]);
  const span = hi - lo;
  if (!Number.isFinite(span) || span <= 0) {
    return null;
  }
  const scale = deltaY < 0 ? 1 / zoomFactorPerStep : zoomFactorPerStep;
  const newSpan = span * scale;
  if (newSpan >= dataBounds[1] - dataBounds[0] - 1e-12) {
    return null;
  }
  const ratio = (anchor - lo) / span;
  const newLo = anchor - ratio * newSpan;
  const newHi = newLo + newSpan;
  return clampSpectrumAxisDomain([newLo, newHi], dataBounds, minSpan);
}

/**
 * Shifts an axis domain by a pixel drag delta using the plot pixel span and data bounds.
 */
export function panAxisDomain(
  startDomain: [number, number],
  dataBounds: [number, number],
  pixelDelta: number,
  plotPixelSpan: number,
): [number, number] | null {
  if (plotPixelSpan <= 0) {
    return null;
  }
  const lo = Math.min(startDomain[0], startDomain[1]);
  const hi = Math.max(startDomain[0], startDomain[1]);
  const domainSpan = hi - lo;
  const dataDelta = (-pixelDelta * domainSpan) / plotPixelSpan;
  const newLo = lo + dataDelta;
  const newHi = hi + dataDelta;
  const constrainedLo = Math.max(dataBounds[0], newLo);
  const constrainedHi = Math.min(dataBounds[1], newHi);
  if (constrainedLo >= constrainedHi) {
    return null;
  }
  return [constrainedLo, constrainedHi];
}

/**
 * Pans a vertically oriented plot axis whose scale range increases downward in pixel space.
 */
export function panVerticalAxisDomain(
  startDomain: [number, number],
  dataBounds: [number, number],
  pixelDelta: number,
  plotPixelSpan: number,
): [number, number] | null {
  return panAxisDomain(startDomain, dataBounds, -pixelDelta, plotPixelSpan);
}
