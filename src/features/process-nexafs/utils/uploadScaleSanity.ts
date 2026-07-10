import type { SpectrumPoint } from "~/components/plots/types";
import type { BareAtomPoint, PrimaryRepresentation } from "../types";
import { betaFromMassAbsorption } from "./opticalConstants";

/**
 * Returns non-blocking scale warnings when uploaded primary values look inconsistent
 * with bare-atom references or channel semantics.
 */
export function buildUploadScaleSanityWarnings(args: {
  points: SpectrumPoint[];
  primaryRepresentation: PrimaryRepresentation;
  bareAtomPoints: BareAtomPoint[] | null;
}): string[] {
  const warnings: string[] = [];
  const { points, primaryRepresentation, bareAtomPoints } = args;
  if (points.length === 0) {
    return warnings;
  }

  if (primaryRepresentation === "beta") {
    const betas = points
      .map((p) => p.absorption)
      .filter((v) => Number.isFinite(v));
    if (betas.length > 0) {
      const maxBeta = Math.max(...betas);
      if (maxBeta > 0.01) {
        warnings.push(
          "Beta values exceed 0.01; confirm the primary column is optical beta, not mass absorption.",
        );
      }
    }
  }

  if (primaryRepresentation === "chi2") {
    warnings.push(
      "Chi2 primary is converted using the same epsilon2 relation (beta = eps2/2). Confirm the column is dielectric epsilon2, not magnetic chi double-prime.",
    );
  }

  if (primaryRepresentation === "f2") {
    warnings.push(
      "f2 primary assumes compound-level Henke f2 divided by total molecular weight. Per-absorbing-atom f2 columns need stoichiometry weighting and may scale incorrectly for polyatomics.",
    );
  }

  if (primaryRepresentation === "epsilon2") {
    warnings.push(
      "Epsilon2 primary uses beta = eps2/2 at 1 g/cm3. Confirm the column is dielectric epsilon2, not another optical constant.",
    );
  }

  if (
    primaryRepresentation === "raw_mu" ||
    primaryRepresentation === "mass_absorption"
  ) {
    if (bareAtomPoints && bareAtomPoints.length > 0) {
      const bareByEnergy = new Map(
        bareAtomPoints.map((p) => [p.energy, p.absorption]),
      );
      const ratios: number[] = [];
      for (const p of points) {
        const mu = p.massabsorption ?? p.absorption;
        const bare = bareByEnergy.get(p.energy);
        if (
          typeof mu === "number" &&
          Number.isFinite(mu) &&
          typeof bare === "number" &&
          Number.isFinite(bare) &&
          bare > 0
        ) {
          ratios.push(mu / bare);
        }
      }
      if (ratios.length > 0) {
        const median = [...ratios].sort((a, b) => a - b)[
          Math.floor(ratios.length / 2)
        ]!;
        if (median > 100 || median < 0.01) {
          warnings.push(
            "Mass-absorption scale differs from bare-atom reference by more than two orders of magnitude; verify primary representation.",
          );
        }
      }
    }
  }

  if (primaryRepresentation === "od") {
    const ods = points
      .map((p) => p.absorption)
      .filter((v) => Number.isFinite(v));
    if (ods.length > 0) {
      const min = Math.min(...ods);
      const max = Math.max(...ods);
      if (min < -0.05 || max > 1.5) {
        warnings.push(
          "OD values fall outside a typical 0-1 plateau range; confirm the primary column is normalized OD.",
        );
      }
    }
  }

  if (primaryRepresentation === "beta" || primaryRepresentation === "mass_absorption") {
    const pairs = points
      .map((p) => {
        const beta = p.beta;
        const mass = p.massabsorption;
        if (
          typeof beta !== "number" ||
          typeof mass !== "number" ||
          !(p.energy > 0)
        ) {
          return null;
        }
        const expected = betaFromMassAbsorption(mass, p.energy);
        if (!Number.isFinite(expected) || expected === 0) {
          return null;
        }
        return Math.abs(beta - expected) / Math.abs(expected);
      })
      .filter((v): v is number => v != null);
    if (pairs.length > 0) {
      const median = [...pairs].sort((a, b) => a - b)[
        Math.floor(pairs.length / 2)
      ]!;
      if (median > 0.15) {
        warnings.push(
          "Uploaded beta and mass_absorption columns disagree beyond 15% median relative error.",
        );
      }
    }
  }

  return warnings;
}

/** Primary representations treated as already processed (no zero-one refit on upload). */
export function isProcessedPrimaryRepresentation(
  representation: PrimaryRepresentation,
): boolean {
  return (
    representation === "beta" ||
    representation === "mass_absorption" ||
    representation === "f2" ||
    representation === "epsilon2" ||
    representation === "chi2"
  );
}

function windowMedianRelativeError(
  hubPoints: SpectrumPoint[],
  bareAtomPoints: BareAtomPoint[],
  window: [number, number],
): number | null {
  const lo = Math.min(window[0], window[1]);
  const hi = Math.max(window[0], window[1]);
  const bareByEnergy = new Map(
    bareAtomPoints.map((p) => [p.energy, p.absorption]),
  );
  const relErrors: number[] = [];
  for (const p of hubPoints) {
    if (p.energy < lo || p.energy > hi) {
      continue;
    }
    const mu = p.massabsorption ?? p.absorption;
    const bare = bareByEnergy.get(p.energy);
    if (
      typeof mu !== "number" ||
      !Number.isFinite(mu) ||
      typeof bare !== "number" ||
      !Number.isFinite(bare) ||
      bare === 0
    ) {
      continue;
    }
    relErrors.push(Math.abs(mu - bare) / Math.abs(bare));
  }
  if (relErrors.length === 0) {
    return null;
  }
  const sorted = [...relErrors].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)]!;
}

/**
 * Summarizes pre/post bare-atom agreement for processed-primary uploads using hub mass absorption.
 */
export function buildProcessedPrimaryBareAtomAgreement(args: {
  points: SpectrumPoint[];
  bareAtomPoints: BareAtomPoint[] | null;
  pre: [number, number] | null;
  post: [number, number] | null;
}): string[] {
  const { points, bareAtomPoints, pre, post } = args;
  if (!bareAtomPoints?.length || !pre || !post || points.length === 0) {
    return [];
  }
  const preErr = windowMedianRelativeError(points, bareAtomPoints, pre);
  const postErr = windowMedianRelativeError(points, bareAtomPoints, post);
  const lines: string[] = [];
  if (preErr != null) {
    lines.push(
      `Pre-edge bare-atom agreement: median relative residual ${(preErr * 100).toFixed(1)}%.`,
    );
  }
  if (postErr != null) {
    lines.push(
      `Post-edge bare-atom agreement: median relative residual ${(postErr * 100).toFixed(1)}%.`,
    );
  }
  return lines;
}
