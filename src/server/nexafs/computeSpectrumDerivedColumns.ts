import type { SpectrumPoint } from "~/components/plots/types";
import type { BareAtomPoint, PrimaryRepresentation } from "~/features/process-nexafs/types";
import {
  buildMassAbsorptionHubPoints,
  deriveOdAndBetaFromHub,
} from "~/features/process-nexafs/utils/representationToMassAbsorption";
import { defaultNormalizationRangesFromSpectrum } from "~/features/process-nexafs/utils/normalizationDefaults";
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

/**
 * Derives OD, mass absorption, and beta from uploaded points using the mass-absorption hub
 * when the client did not supply complete scalar columns.
 */
export async function computeSpectrumDerivedScalarColumns(
  points: SpectrumPoint[],
  chemicalFormula: string | null,
  primaryRepresentation: PrimaryRepresentation = "raw_mu",
): Promise<SpectrumDerivedScalarColumns> {
  const n = points.length;
  if (n === 0) {
    return { od: [], massabsorption: [], beta: [] };
  }

  const ranges = defaultNormalizationRangesFromSpectrum(points);
  const pre = ranges?.pre ?? null;
  const post = ranges?.post ?? null;

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
