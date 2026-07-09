import type { SpectrumPoint } from "~/components/plots/types";
import type { DatasetState } from "../types";
import { defaultNormalizationRangesFromSpectrum } from "./normalizationDefaults";
import {
  buildMassAbsorptionHubPoints,
  deriveOdAndBetaFromHub,
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
 * Builds upload-ready spectrum rows: preserves the uploaded primary in absorption (rawabs),
 * converts to the mass-absorption hub, and derives OD/beta when not uploaded.
 */
export function buildSpectrumPointsWithDerivedForUpload(
  dataset: DatasetState,
): SpectrumPoint[] {
  const points = dataset.spectrumPoints;
  if (points.length === 0) return [];

  let pre = dataset.normalizationRegions.pre;
  let post = dataset.normalizationRegions.post;
  if (!pre || !post) {
    const fallback = defaultNormalizationRangesFromSpectrum(points);
    if (fallback) {
      pre = pre ?? fallback.pre;
      post = post ?? fallback.post;
    }
  }

  const formulaMass =
    typeof dataset.sampleInfo.molecularWeight === "number" &&
    Number.isFinite(dataset.sampleInfo.molecularWeight)
      ? dataset.sampleInfo.molecularWeight
      : null;

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

    if (
      dataset.primaryRepresentation === "beta" &&
      typeof base.absorption === "number" &&
      Number.isFinite(base.absorption) &&
      next.beta === undefined
    ) {
      next.beta = base.absorption;
    }

    return next;
  });
}

/**
 * Reports whether an upload draft can run browser-side beta-to-delta KK on every row.
 */
export function uploadDatasetHasFiniteBetaForKkOnEveryRow(
  dataset: DatasetState,
): boolean {
  const derived = buildSpectrumPointsWithDerivedForUpload(dataset);
  if (derived.length === 0) {
    return false;
  }
  return derived.every(
    (p) => typeof p.beta === "number" && Number.isFinite(p.beta),
  );
}
