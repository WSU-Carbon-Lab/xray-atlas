import type { SpectrumPoint } from "~/components/plots/types";
import type { BareAtomPoint, PrimaryRepresentation } from "../types";
import {
  computeNormalizationForExperiment,
  computeZeroOneNormalization,
} from "./core";
import {
  betaFromMassAbsorption,
  massAbsorptionFromBeta,
  massAbsorptionFromEpsilon2,
  massAbsorptionFromF2,
} from "./opticalConstants";

export type MassAbsorptionHubOptions = {
  barePoints: BareAtomPoint[];
  pre: [number, number] | null;
  post: [number, number] | null;
  formulaMassGPerMol?: number | null;
};

function primaryScalarForPoint(
  point: SpectrumPoint,
  representation: PrimaryRepresentation,
): number {
  switch (representation) {
    case "mass_absorption":
      return point.massabsorption ?? point.absorption;
    case "beta":
      return point.beta ?? point.absorption;
    case "od":
      return point.od ?? point.absorption;
    case "f2":
    case "epsilon2":
    case "chi2":
    case "raw_mu":
      return point.absorption;
    default: {
      const _exhaustive: never = representation;
      return _exhaustive;
    }
  }
}

function pointMassAbsorptionFromPrimary(
  point: SpectrumPoint,
  representation: PrimaryRepresentation,
  formulaMassGPerMol: number | null,
): number {
  const E = point.energy;
  const primary = primaryScalarForPoint(point, representation);
  if (!Number.isFinite(primary)) {
    return Number.NaN;
  }
  switch (representation) {
    case "mass_absorption":
      return primary;
    case "beta":
      return massAbsorptionFromBeta(primary, E);
    case "f2": {
      if (formulaMassGPerMol == null || !(formulaMassGPerMol > 0)) {
        return Number.NaN;
      }
      return massAbsorptionFromF2(primary, E, formulaMassGPerMol);
    }
    case "epsilon2":
    case "chi2":
      return massAbsorptionFromEpsilon2(primary, E);
    case "od":
    case "raw_mu":
      return primary;
    default: {
      const _exhaustive: never = representation;
      return _exhaustive;
    }
  }
}

/**
 * Maps uploaded spectrum rows from the declared primary representation into mass-absorption
 * hub samples at rho = 1 g/cm3; windowed bare-atom fits apply for raw_mu and od primaries.
 */
export function buildMassAbsorptionHubPoints(
  points: SpectrumPoint[],
  representation: PrimaryRepresentation,
  options: MassAbsorptionHubOptions,
): SpectrumPoint[] | null {
  if (points.length === 0) {
    return null;
  }

  if (representation === "raw_mu" || representation === "od") {
    const { barePoints, pre, post } = options;
    if (!pre || !post || barePoints.length === 0) {
      return null;
    }
    const sourcePoints = points.map((p) => ({
      ...p,
      absorption: pointMassAbsorptionFromPrimary(
        p,
        representation,
        options.formulaMassGPerMol ?? null,
      ),
    }));
    const fit = computeNormalizationForExperiment(
      sourcePoints,
      barePoints,
      pre,
      post,
    );
    if (!fit) {
      return null;
    }
    return fit.normalizedPoints.map((p) => ({
      ...p,
      absorption: p.absorption,
      massabsorption: p.absorption,
    }));
  }

  const formulaMass = options.formulaMassGPerMol ?? null;
  const hub: SpectrumPoint[] = points.map((p) => {
    const mu = pointMassAbsorptionFromPrimary(p, representation, formulaMass);
    return {
      ...p,
      absorption: mu,
      massabsorption: Number.isFinite(mu) ? mu : undefined,
    };
  });

  if (hub.some((p) => !Number.isFinite(p.absorption))) {
    return null;
  }
  return hub;
}

/**
 * Derives OD and beta channel arrays from mass-absorption hub points using zero-one windows
 * and the exact beta = mu*lambda/(4*pi) relation.
 */
export function deriveOdAndBetaFromHub(
  hubPoints: SpectrumPoint[],
  pre: [number, number] | null,
  post: [number, number] | null,
): { od: Array<number | null>; beta: Array<number | null> } {
  const n = hubPoints.length;
  const od: Array<number | null> = Array.from({ length: n }, () => null);
  const beta: Array<number | null> = Array.from({ length: n }, () => null);

  if (pre && post) {
    const odComp = computeZeroOneNormalization(hubPoints, pre, post);
    if (odComp) {
      for (let i = 0; i < n; i++) {
        const v = odComp.normalizedPoints[i]?.absorption;
        od[i] = typeof v === "number" && Number.isFinite(v) ? v : null;
      }
    }
  }

  for (let i = 0; i < n; i++) {
    const p = hubPoints[i]!;
    const mu = p.massabsorption ?? p.absorption;
    const b = betaFromMassAbsorption(mu, p.energy);
    beta[i] = Number.isFinite(b) ? b : null;
  }

  return { od, beta };
}
