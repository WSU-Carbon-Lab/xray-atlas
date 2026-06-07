import {
  linkedOpticalAngleColumnTitle,
  resolveLinkedOpticalAngleSplit,
  type SpectrumGeometryAngleSplit,
} from "~/components/plots/spectrum/spectrum-geometry-legend-angle";

/**
 * Formats one finite polarization angle in compact legend copy (`55°`, not `θ=55.0°`).
 */
export function formatPlotViewerAngleDegrees(value: number | undefined): string {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "—";
  }
  const rounded = Math.round(value * 10) / 10;
  const text =
    Number.isInteger(rounded) || rounded % 1 === 0
      ? String(Math.round(rounded))
      : rounded.toFixed(1);
  return `${text}°`;
}

/**
 * Parses `theta:phi` geometry keys produced by {@link geometryKeyFromPoint}.
 */
export function parsePlotViewerGeometryKey(
  geometryKey: string,
): { theta?: number; phi?: number } | null {
  if (geometryKey === "fixed") {
    return null;
  }
  const [thetaText, phiText] = geometryKey.split(":");
  const theta = Number(thetaText);
  const phi = Number(phiText);
  const finiteTheta = Number.isFinite(theta);
  const finitePhi = Number.isFinite(phi);
  if (!finiteTheta && !finitePhi) {
    return null;
  }
  return {
    theta: finiteTheta ? theta : undefined,
    phi: finitePhi ? phi : undefined,
  };
}

/**
 * Detects fixed θ or fixed φ across plot-viewer traces from their geometry keys.
 */
export function resolvePlotViewerAngleSplit(
  geometryKeys: readonly string[],
): SpectrumGeometryAngleSplit {
  const geometries = geometryKeys
    .map(parsePlotViewerGeometryKey)
    .filter((geometry): geometry is { theta?: number; phi?: number } => geometry !== null);
  return resolveLinkedOpticalAngleSplit(geometries);
}

/**
 * Resolves the θ / φ descriptor column title from active trace geometry keys.
 */
export function plotViewerThetaPhiColumnTitle(
  geometryKeys: readonly string[],
): string {
  const split = resolvePlotViewerAngleSplit(geometryKeys);
  return linkedOpticalAngleColumnTitle(false, false, split);
}

/**
 * Builds compact θ / φ legend cell text for one trace geometry group.
 */
export function formatPlotViewerGeometryCellLabel(params: {
  geometryKey: string;
  theta?: number;
  phi?: number;
  fixedLabel?: string;
  split?: SpectrumGeometryAngleSplit;
}): string {
  if (params.geometryKey === "fixed") {
    return params.fixedLabel?.trim() || "Fixed";
  }

  const split =
    params.split ??
    resolvePlotViewerAngleSplit([params.geometryKey]);
  const theta = params.theta;
  const phi = params.phi;
  const finiteTheta = typeof theta === "number" && Number.isFinite(theta);
  const finitePhi = typeof phi === "number" && Number.isFinite(phi);

  if (split.singlePhi && finiteTheta) {
    return formatPlotViewerAngleDegrees(theta);
  }
  if (split.singleTheta && finitePhi) {
    return formatPlotViewerAngleDegrees(phi);
  }
  if (finiteTheta && !finitePhi) {
    return formatPlotViewerAngleDegrees(theta);
  }
  if (finitePhi && !finiteTheta) {
    return formatPlotViewerAngleDegrees(phi);
  }
  if (finiteTheta && finitePhi) {
    return `${formatPlotViewerAngleDegrees(theta)} · ${formatPlotViewerAngleDegrees(phi)}`;
  }
  return params.fixedLabel?.trim() || "Fixed";
}
