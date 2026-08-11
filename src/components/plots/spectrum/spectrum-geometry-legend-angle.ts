/**
 * Angle column title and per-row labels for spectrum geometry legends (linked and single).
 *
 * When both θ and φ vary across traces, the legend renders two explicit numeric
 * columns so the pair stays readable without inventing a second encoding.
 */

/** Whether grouped traces share one φ or one θ (NEXAFS browse legend convention). */
export type SpectrumGeometryAngleSplit = {
  readonly singlePhi: boolean;
  readonly singleTheta: boolean;
};

/**
 * Structured angle cells for one legend row.
 *
 * - `single`: one value (θ-only, φ-only, or fallback label)
 * - `pair`: separate θ and φ cells when both angles vary
 */
export type SpectrumGeometryAngleDisplay =
  | {
      readonly mode: "single";
      readonly label: string;
    }
  | {
      readonly mode: "pair";
      readonly thetaLabel: string;
      readonly phiLabel: string;
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
 * Resolves whether the legend should render separate θ and φ columns.
 */
export function spectrumGeometryLegendUsesPairColumns(
  showThetaData: boolean,
  showPhiData: boolean,
  split: SpectrumGeometryAngleSplit,
): boolean {
  if (showThetaData && !showPhiData) {
    return false;
  }
  if (showPhiData && !showThetaData) {
    return false;
  }
  if (!showThetaData && !showPhiData) {
    if (split.singlePhi && !split.singleTheta) {
      return false;
    }
    if (split.singleTheta && !split.singlePhi) {
      return false;
    }
  }
  return !split.singlePhi && !split.singleTheta;
}

/**
 * Formats structured angle cells from geometry on spectrum points (DB polardeg / azimuthdeg).
 */
export function angleDisplayForSpectrumGeometryGroup(
  group: { theta?: number; phi?: number; label: string },
  showThetaData: boolean,
  showPhiData: boolean,
  split: SpectrumGeometryAngleSplit,
): SpectrumGeometryAngleDisplay {
  const theta = group.theta;
  const phi = group.phi;
  const finiteTheta = typeof theta === "number" && Number.isFinite(theta);
  const finitePhi = typeof phi === "number" && Number.isFinite(phi);

  if (showThetaData && !showPhiData && finiteTheta) {
    return { mode: "single", label: formatAngleDegrees(theta) };
  }
  if (showPhiData && !showThetaData && finitePhi) {
    return { mode: "single", label: formatAngleDegrees(phi) };
  }

  if (!showThetaData && !showPhiData) {
    if (split.singlePhi && finiteTheta) {
      return { mode: "single", label: formatAngleDegrees(theta) };
    }
    if (split.singleTheta && finitePhi) {
      return { mode: "single", label: formatAngleDegrees(phi) };
    }
  }

  if (finiteTheta && !finitePhi) {
    return { mode: "single", label: formatAngleDegrees(theta) };
  }
  if (finitePhi && !finiteTheta) {
    return { mode: "single", label: formatAngleDegrees(phi) };
  }
  if (finiteTheta && finitePhi) {
    if (spectrumGeometryLegendUsesPairColumns(showThetaData, showPhiData, split)) {
      return {
        mode: "pair",
        thetaLabel: formatAngleDegrees(theta),
        phiLabel: formatAngleDegrees(phi),
      };
    }
    if (split.singlePhi) {
      return { mode: "single", label: formatAngleDegrees(theta) };
    }
    if (split.singleTheta) {
      return { mode: "single", label: formatAngleDegrees(phi) };
    }
    return {
      mode: "pair",
      thetaLabel: formatAngleDegrees(theta),
      phiLabel: formatAngleDegrees(phi),
    };
  }
  return { mode: "single", label: group.label };
}

/**
 * Formats the angle column cell from geometry on spectrum points (DB polardeg / azimuthdeg).
 *
 * Prefer {@link angleDisplayForSpectrumGeometryGroup} for legend layout; this string
 * form remains for aria labels, exports, and compact descriptors.
 */
export function angleLabelForSpectrumGeometryGroup(
  group: { theta?: number; phi?: number; label: string },
  showThetaData: boolean,
  showPhiData: boolean,
  split: SpectrumGeometryAngleSplit,
): string {
  const display = angleDisplayForSpectrumGeometryGroup(
    group,
    showThetaData,
    showPhiData,
    split,
  );
  if (display.mode === "single") {
    return display.label;
  }
  return `${display.thetaLabel}, ${display.phiLabel}`;
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
