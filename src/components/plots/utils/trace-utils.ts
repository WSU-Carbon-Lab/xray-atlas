/**
 * Utility functions for trace building and geometry handling
 */

import type { SpectrumPoint, GeometryGroup } from "../types";

/**
 * Build geometry label from theta and phi values
 */
export function buildGeometryLabel(
  theta?: number,
  phi?: number,
): string {
  const thetaLabel =
    typeof theta === "number" && Number.isFinite(theta)
      ? `θ=${theta.toFixed(1)}°`
      : null;
  const phiLabel =
    typeof phi === "number" && Number.isFinite(phi)
      ? `φ=${phi.toFixed(1)}°`
      : null;

  if (!thetaLabel && !phiLabel) {
    return "Fixed Geometry";
  }

  return [thetaLabel, phiLabel].filter(Boolean).join(", ");
}

/**
 * Group points by geometry (theta/phi combination)
 */
export function groupPointsByGeometry(
  points: SpectrumPoint[],
): Map<string, GeometryGroup> {
  const groups = new Map<string, GeometryGroup>();

  points.forEach((point) => {
    const hasGeometry =
      typeof point.theta === "number" &&
      Number.isFinite(point.theta) &&
      typeof point.phi === "number" &&
      Number.isFinite(point.phi);

    const key = hasGeometry ? `${point.theta}:${point.phi}` : "fixed";
    const label = buildGeometryLabel(point.theta, point.phi);

    const group = groups.get(key);
    if (group) {
      group.energies.push(point.energy);
      group.absorptions.push(point.absorption);
    } else {
      groups.set(key, {
        label,
        theta: point.theta,
        phi: point.phi,
        energies: [point.energy],
        absorptions: [point.absorption],
      });
    }
  });

  return groups;
}

/**
 * Filter points by geometry (theta/phi match)
 */
export function filterPointsByGeometry(
  points: SpectrumPoint[],
  geometry: { theta?: number; phi?: number } | null,
): SpectrumPoint[] {
  if (!geometry) return [];

  return points.filter((point) => {
    const hasGeometry =
      typeof point.theta === "number" &&
      Number.isFinite(point.theta) &&
      typeof point.phi === "number" &&
      Number.isFinite(point.phi);

    if (!hasGeometry) {
      // If selected geometry is null/undefined, match fixed geometry points
      return (
        geometry.theta === undefined && geometry.phi === undefined
      );
    }

    const thetaMatch =
      geometry.theta === undefined ||
      (typeof point.theta === "number" &&
        Number.isFinite(point.theta) &&
        Math.abs(point.theta - geometry.theta) < 0.01);
    const phiMatch =
      geometry.phi === undefined ||
      (typeof point.phi === "number" &&
        Number.isFinite(point.phi) &&
        Math.abs(point.phi - geometry.phi) < 0.01);

    return thetaMatch && phiMatch;
  });
}
