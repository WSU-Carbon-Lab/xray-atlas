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
import { defaultNormalizationRangesFromSpectrum } from "./normalizationDefaults";

export type MassAbsorptionHubOptions = {
  barePoints: BareAtomPoint[];
  pre: [number, number] | null;
  post: [number, number] | null;
  formulaMassGPerMol?: number | null;
};

/**
 * Reads the uploaded primary scalar from the mapped primary column (`absorption`).
 */
function primaryScalarForPoint(point: SpectrumPoint): number {
  return point.absorption;
}

function pointMassAbsorptionFromPrimary(
  point: SpectrumPoint,
  representation: PrimaryRepresentation,
  formulaMassGPerMol: number | null,
): number {
  const E = point.energy;
  const primary = primaryScalarForPoint(point);
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
      return massAbsorptionFromEpsilon2(primary, E);
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

function hubHasFiniteRows(hub: SpectrumPoint[]): boolean {
  return hub.some((p) =>
    Number.isFinite(p.massabsorption ?? p.absorption),
  );
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

  if (!hubHasFiniteRows(hub)) {
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
    const finiteHub = hubPoints.filter((p) =>
      Number.isFinite(p.massabsorption ?? p.absorption),
    );
    if (finiteHub.length > 0) {
      const odComp = computeZeroOneNormalization(finiteHub, pre, post);
      if (odComp) {
        let odIndex = 0;
        for (let i = 0; i < n; i++) {
          const p = hubPoints[i]!;
          if (!Number.isFinite(p.massabsorption ?? p.absorption)) {
            continue;
          }
          const v = odComp.normalizedPoints[odIndex]?.absorption;
          odIndex += 1;
          od[i] = typeof v === "number" && Number.isFinite(v) ? v : null;
        }
      }
    }
  }

  for (let i = 0; i < n; i++) {
    const p = hubPoints[i]!;
    const mu = p.massabsorption ?? p.absorption;
    if (!Number.isFinite(mu)) {
      continue;
    }
    const b = betaFromMassAbsorption(mu, p.energy);
    beta[i] = Number.isFinite(b) ? b : null;
  }

  return { od, beta };
}

export type NormalizationWindowPair = {
  pre: [number, number] | null;
  post: [number, number] | null;
};

/**
 * Resolves pre/post normalization windows from contributor ranges with spectrum auto-fallback.
 */
export function resolveNormalizationWindowsForHub(
  points: SpectrumPoint[],
  contributorRanges: NormalizationWindowPair | null | undefined,
): NormalizationWindowPair {
  const fallback = defaultNormalizationRangesFromSpectrum(points);
  const pre = contributorRanges?.pre ?? fallback?.pre ?? null;
  const post = contributorRanges?.post ?? fallback?.post ?? null;
  return { pre, post };
}
