export function linearYDomainWithPadding(
  minY: number,
  maxY: number,
  padFraction: number,
): [number, number] {
  const delta = maxY - minY;
  const span =
    delta > 0
      ? delta
      : Math.max(Math.abs(maxY), Math.abs(minY), Number.EPSILON) * 0.05;
  const pad = Math.max(span * padFraction, span * 0.02);
  if (minY < 0) {
    return [minY - pad, maxY + pad];
  }
  return [Math.max(0, minY - pad * 0.25), maxY + pad];
}
