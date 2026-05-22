/**
 * Angle column title and per-row labels for spectrum geometry legends (linked and single).
 */

/** Whether grouped traces share one φ or one θ (NEXAFS browse legend convention). */
export type SpectrumGeometryAngleSplit = {
  readonly singlePhi: boolean;
  readonly singleTheta: boolean;
};

function formatAngleDegrees(value: number): string {
  return `${value.toFixed(1)}°`;
}

/**
 * Detects fixed φ or fixed θ across legend rows so the angle column shows the splitting coordinate
 * (θ when comparing polarizations at one φ, φ when comparing at one θ).
 */
export function resolveLinkedOpticalAngleSplit(
  geometries: readonly { theta?: number; phi?: number }[],
): SpectrumGeometryAngleSplit {
  const phis = new Set<number>();
  const thetas = new Set<number>();
  for (const g of geometries) {
    if (typeof g.phi === "number" && Number.isFinite(g.phi)) {
      phis.add(g.phi);
    }
    if (typeof g.theta === "number" && Number.isFinite(g.theta)) {
      thetas.add(g.theta);
    }
  }
  return {
    singlePhi: phis.size <= 1,
    singleTheta: thetas.size <= 1,
  };
}

/**
 * Formats the angle column cell from geometry on spectrum points (DB polardeg / azimuthdeg).
 */
export function angleLabelForSpectrumGeometryGroup(
  group: { theta?: number; phi?: number; label: string },
  showThetaData: boolean,
  showPhiData: boolean,
  split: SpectrumGeometryAngleSplit,
): string {
  const theta = group.theta;
  const phi = group.phi;
  const finiteTheta = typeof theta === "number" && Number.isFinite(theta);
  const finitePhi = typeof phi === "number" && Number.isFinite(phi);

  if (showThetaData && !showPhiData && finiteTheta) {
    return formatAngleDegrees(theta);
  }
  if (showPhiData && !showThetaData && finitePhi) {
    return formatAngleDegrees(phi);
  }

  if (!showThetaData && !showPhiData) {
    if (split.singlePhi && finiteTheta) {
      return formatAngleDegrees(theta);
    }
    if (split.singleTheta && finitePhi) {
      return formatAngleDegrees(phi);
    }
  }

  if (finiteTheta && !finitePhi) {
    return formatAngleDegrees(theta);
  }
  if (finitePhi && !finiteTheta) {
    return formatAngleDegrees(phi);
  }
  if (finiteTheta && finitePhi) {
    return `${formatAngleDegrees(theta)} · ${formatAngleDegrees(phi)}`;
  }
  return group.label;
}

/**
 * Column title for the geometry legend angle column (θ, φ, or both).
 */
export function linkedOpticalAngleColumnTitle(
  showThetaData: boolean,
  showPhiData: boolean,
  split?: SpectrumGeometryAngleSplit,
): string {
  if (showThetaData && !showPhiData) {
    return "θ";
  }
  if (showPhiData && !showThetaData) {
    return "φ";
  }
  if (split?.singlePhi && !split.singleTheta) {
    return "θ";
  }
  if (split?.singleTheta && !split.singlePhi) {
    return "φ";
  }
  return "θ / φ";
}
