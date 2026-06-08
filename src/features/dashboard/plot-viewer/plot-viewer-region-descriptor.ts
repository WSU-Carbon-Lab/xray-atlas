import type { SpectrumGeometryAngleSplit } from "~/components/plots/spectrum/spectrum-geometry-legend-angle";
import {
  formatPlotViewerAngleDegrees,
  formatPlotViewerGeometryCellLabel,
  parsePlotViewerGeometryKey,
} from "./format-plot-viewer-geometry-label";

/** Generic STXM spot placeholder when no user label is assigned. */
export const PLOT_VIEWER_UNNAMED_REGION_LABEL = "region";

/**
 * Returns true when `label` is a non-empty, user-facing region name rather than a generic placeholder.
 */
export function isPlotViewerNamedRegionLabel(label: string): boolean {
  const trimmed = label.trim();
  if (trimmed.length === 0) {
    return false;
  }
  return trimmed.toLowerCase() !== PLOT_VIEWER_UNNAMED_REGION_LABEL;
}

export type ResolvePlotViewerRegionDescriptorParams = {
  regionLabel: string;
  theta?: number;
  phi?: number;
  geometryKey?: string;
  fixedLabel?: string;
  angleSplit?: SpectrumGeometryAngleSplit;
};

/**
 * Resolves the Region legend column: named sample spot when present, otherwise compact incident θ
 * (and φ when both vary) using the same formatting as plot-viewer geometry descriptors.
 */
export function resolvePlotViewerRegionDescriptor(
  params: ResolvePlotViewerRegionDescriptorParams,
): string {
  if (isPlotViewerNamedRegionLabel(params.regionLabel)) {
    return params.regionLabel.trim();
  }

  const finiteTheta =
    typeof params.theta === "number" && Number.isFinite(params.theta);
  const finitePhi = typeof params.phi === "number" && Number.isFinite(params.phi);

  if (finiteTheta && !finitePhi) {
    return formatPlotViewerAngleDegrees(params.theta);
  }

  const geometryKey = params.geometryKey?.trim();
  if (geometryKey) {
    const parsed = parsePlotViewerGeometryKey(geometryKey);
    const theta = finiteTheta ? params.theta : parsed?.theta;
    const phi = finitePhi ? params.phi : parsed?.phi;
    const angleLabel = formatPlotViewerGeometryCellLabel({
      geometryKey,
      theta,
      phi,
      fixedLabel: params.fixedLabel,
      split: params.angleSplit,
    });
    if (angleLabel.trim().length > 0 && angleLabel !== "Fixed") {
      return angleLabel;
    }
    if (typeof theta === "number" && Number.isFinite(theta)) {
      return formatPlotViewerAngleDegrees(theta);
    }
  }

  if (finiteTheta) {
    return formatPlotViewerAngleDegrees(params.theta);
  }

  return "";
}
