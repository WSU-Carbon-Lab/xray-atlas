import type { SpectrumPoint } from "~/components/plots/types";
import type { DatasetState } from "../types";
import {
  computeMolecularWeight,
  parseChemicalFormula,
} from "~/server/utils/chemistry";
import {
  buildMassAbsorptionHubPoints,
  deriveOdAndBetaFromHub,
  resolveNormalizationWindowsForHub,
} from "./representationToMassAbsorption";

function coalesceUploaded(
  uploaded: number | undefined,
  derived: number | null,
): number | undefined {
  if (typeof uploaded === "number" && Number.isFinite(uploaded)) {
    return uploaded;
  }
  if (typeof derived === "number" && Number.isFinite(derived)) {
    return derived;
  }
  return undefined;
}

/**
 * Resolves formula mass (g/mol) from sample metadata or an optional molecule formula string.
 */
export function resolveFormulaMassGPerMol(args: {
  sampleMolecularWeight: number | null | undefined;
  chemicalFormula: string | null | undefined;
}): number | null {
  if (
    typeof args.sampleMolecularWeight === "number" &&
    Number.isFinite(args.sampleMolecularWeight) &&
    args.sampleMolecularWeight > 0
  ) {
    return args.sampleMolecularWeight;
  }
  const formula = args.chemicalFormula?.trim();
  if (!formula) {
    return null;
  }
  try {
    const mass = computeMolecularWeight(parseChemicalFormula(formula));
    return mass > 0 ? mass : null;
  } catch {
    return null;
  }
}

/**
 * Builds upload-ready spectrum rows: preserves the uploaded primary in absorption (rawabs),
 * converts to the mass-absorption hub, and derives OD/beta when not uploaded.
 */
export function buildSpectrumPointsWithDerivedForUpload(
  dataset: DatasetState,
  options?: { chemicalFormula?: string | null },
): SpectrumPoint[] {
  const points = dataset.spectrumPoints;
  if (points.length === 0) return [];

  const { pre, post } = resolveNormalizationWindowsForHub(points, {
    pre: dataset.normalizationRegions.pre,
    post: dataset.normalizationRegions.post,
  });

  const formulaMass = resolveFormulaMassGPerMol({
    sampleMolecularWeight: dataset.sampleInfo.molecularWeight,
    chemicalFormula: options?.chemicalFormula ?? null,
  });

  const hub = buildMassAbsorptionHubPoints(
    points,
    dataset.primaryRepresentation,
    {
      barePoints: dataset.bareAtomPoints ?? [],
      pre,
      post,
      formulaMassGPerMol: formulaMass,
    },
  );

  const derived =
    hub != null ? deriveOdAndBetaFromHub(hub, pre, post) : { od: [], beta: [] };

  return points.map((base, i) => {
    const hubMu =
      hub?.[i]?.massabsorption ?? hub?.[i]?.absorption ?? null;
    const derivedOd = derived.od[i] ?? null;
    const derivedBeta = derived.beta[i] ?? null;
    const derivedMass =
      typeof hubMu === "number" && Number.isFinite(hubMu) ? hubMu : null;

    const next: SpectrumPoint = { ...base };

    const mass = coalesceUploaded(base.massabsorption, derivedMass);
    if (mass !== undefined) {
      next.massabsorption = mass;
    }

    const od = coalesceUploaded(base.od, derivedOd);
    if (od !== undefined) {
      next.od = od;
    }

    const beta = coalesceUploaded(base.beta, derivedBeta);
    if (beta !== undefined) {
      next.beta = beta;
    }

    return next;
  });
}

/**
 * Reports whether an upload draft can run browser-side beta-to-delta KK on every row.
 */
export function uploadDatasetHasFiniteBetaForKkOnEveryRow(
  dataset: DatasetState,
  options?: { chemicalFormula?: string | null },
): boolean {
  const derived = buildSpectrumPointsWithDerivedForUpload(dataset, options);
  if (derived.length === 0) {
    return false;
  }
  return derived.every(
    (p) => typeof p.beta === "number" && Number.isFinite(p.beta),
  );
}
