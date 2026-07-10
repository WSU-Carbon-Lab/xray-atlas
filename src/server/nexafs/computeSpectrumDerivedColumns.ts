import type { SpectrumPoint } from "~/components/plots/types";
import type { BareAtomPoint, PrimaryRepresentation } from "~/features/process-nexafs/types";
import {
  buildMassAbsorptionHubPoints,
  deriveOdAndBetaFromHub,
  resolveNormalizationWindowsForHub,
  type NormalizationWindowPair,
} from "~/features/process-nexafs/utils/representationToMassAbsorption";
import { betaFromMassAbsorption } from "~/features/process-nexafs/utils/opticalConstants";
import { computeBareAtomAbsorption } from "~/server/utils/cxro";
import {
  computeMolecularWeight,
  parseChemicalFormula,
} from "~/server/utils/chemistry";

export function coalesceUploadedOrDerived(
  uploaded: number | undefined,
  derived: number | null,
): number | null {
  if (typeof uploaded === "number" && Number.isFinite(uploaded)) {
    return uploaded;
  }
  if (typeof derived === "number" && Number.isFinite(derived)) {
    return derived;
  }
  return null;
}

export type SpectrumDerivedScalarColumns = {
  od: Array<number | null>;
  massabsorption: Array<number | null>;
  beta: Array<number | null>;
};

function nullColumn(n: number): Array<number | null> {
  return Array.from({ length: n }, () => null);
}

const BETA_CROSS_RELATIVE_TOLERANCE = 0.15;

/**
 * Returns false when uploaded od/massabsorption/beta disagree with hub recomputation from primaryRepresentation.
 */
export async function uploadedDerivedScalarsConsistentWithPrimary(args: {
  points: SpectrumPoint[];
  chemicalFormula: string | null;
  primaryRepresentation: PrimaryRepresentation;
  normalizationRanges: NormalizationWindowPair | null;
}): Promise<boolean> {
  const derived = await computeSpectrumDerivedScalarColumns(
    args.points,
    args.chemicalFormula,
    args.primaryRepresentation,
    args.normalizationRanges,
  );
  const n = args.points.length;
  for (let i = 0; i < n; i++) {
    const point = args.points[i]!;
    const expectedBeta = derived.beta[i];
    const uploadedBeta = point.beta;
    if (
      typeof uploadedBeta === "number" &&
      Number.isFinite(uploadedBeta) &&
      typeof expectedBeta === "number" &&
      Number.isFinite(expectedBeta) &&
      expectedBeta !== 0
    ) {
      const rel = Math.abs(uploadedBeta - expectedBeta) / Math.abs(expectedBeta);
      if (rel > BETA_CROSS_RELATIVE_TOLERANCE) {
        return false;
      }
    }
    const expectedMass = derived.massabsorption[i];
    const uploadedMass = point.massabsorption;
    if (
      typeof uploadedMass === "number" &&
      Number.isFinite(uploadedMass) &&
      typeof expectedMass === "number" &&
      Number.isFinite(expectedMass) &&
      expectedMass !== 0
    ) {
      const rel = Math.abs(uploadedMass - expectedMass) / Math.abs(expectedMass);
      if (rel > BETA_CROSS_RELATIVE_TOLERANCE) {
        return false;
      }
    }
    const expectedOd = derived.od[i];
    const uploadedOd = point.od;
    if (
      typeof uploadedOd === "number" &&
      Number.isFinite(uploadedOd) &&
      typeof expectedOd === "number" &&
      Number.isFinite(expectedOd)
    ) {
      const rel = Math.abs(uploadedOd - expectedOd) / Math.max(Math.abs(expectedOd), 1e-12);
      if (rel > BETA_CROSS_RELATIVE_TOLERANCE) {
        return false;
      }
    }
  }
  return true;
}

/**
 * Derives OD, mass absorption, and beta from uploaded points using the mass-absorption hub
 * when the client did not supply complete scalar columns.
 */
export async function computeSpectrumDerivedScalarColumns(
  points: SpectrumPoint[],
  chemicalFormula: string | null,
  primaryRepresentation: PrimaryRepresentation = "raw_mu",
  normalizationRanges: NormalizationWindowPair | null = null,
): Promise<SpectrumDerivedScalarColumns> {
  const n = points.length;
  if (n === 0) {
    return { od: [], massabsorption: [], beta: [] };
  }

  const { pre, post } = resolveNormalizationWindowsForHub(
    points,
    normalizationRanges,
  );

  let barePoints: BareAtomPoint[] = [];
  const formula = chemicalFormula?.trim() ?? "";
  if (formula) {
    try {
      const bareMu = await computeBareAtomAbsorption(formula, { density: 1 });
      barePoints = bareMu
        .map((p) => ({ energy: p.energyEv, absorption: p.mu }))
        .sort((a, b) => a.energy - b.energy);
    } catch {
      barePoints = [];
    }
  }

  let formulaMass: number | null = null;
  if (formula) {
    try {
      formulaMass = computeMolecularWeight(parseChemicalFormula(formula));
    } catch {
      formulaMass = null;
    }
  }

  const hub = buildMassAbsorptionHubPoints(points, primaryRepresentation, {
    barePoints,
    pre,
    post,
    formulaMassGPerMol: formulaMass,
  });

  if (!hub) {
    return {
      od: nullColumn(n),
      massabsorption: nullColumn(n),
      beta: nullColumn(n),
    };
  }

  const derived = deriveOdAndBetaFromHub(hub, pre, post);
  return {
    od: derived.od,
    massabsorption: hub.map((p) =>
      Number.isFinite(p.massabsorption ?? p.absorption)
        ? (p.massabsorption ?? p.absorption)
        : null,
    ),
    beta: derived.beta,
  };
}

export { betaFromMassAbsorption };
