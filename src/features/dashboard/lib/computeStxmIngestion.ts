import { calculateBareAtomAbsorption } from "~/features/process-nexafs/utils/bareAtomCalculation";
import {
  grantKkBrowserConsent,
  readKkBrowserConsentGranted,
} from "~/features/kk-calc/browser-consent";
import { computeDeltaFromBetaKkcalcStyle } from "~/features/kk-calc/compute-delta-from-beta-kkcalc-style";
import { DEFAULT_KK_MASS_DENSITY_G_CM3 } from "~/features/kk-calc/compute-delta-from-beta-kkcalc-style";
import type { StxmWeightingMode } from "~/lib/stxm/estimators";
import { regionSumAndSigma } from "~/lib/stxm/estimators";
import { nexafsBeerLambert } from "~/lib/stxm/nexafs";
import {
  bareAtomBetaFromMassAbsorption,
  betaFromNormalizedMassAbsorption,
  fitBareAtomBackground,
  massAbsorptionFromOdFit,
  odErrToBetaErr,
  odToBeta,
} from "~/lib/stxm/absorption";
import {
  normalizeNexafsOd,
  suggestNormalizationWindows,
  type StxmNormalizationWindows,
} from "~/lib/stxm/normalization";
import { sampleIzeroMasks } from "~/lib/stxm/regions";

export type StxmIngestionDisplayChannel =
  | "signal_i0"
  | "signal_sample"
  | "signal_inv_i0"
  | "od"
  | "od_normalized"
  | "mass_absorption"
  | "beta"
  | "delta";

export type StxmIngestionResult = {
  energyEv: number[];
  i0: number[];
  i0Err: number[];
  iSample: number[];
  iSampleErr: number[];
  od: number[];
  odErr: number[];
  odNormalized: number[];
  massAbsorption: number[] | null;
  massAbsorptionErr: number[] | null;
  beta: number[] | null;
  betaErr: number[] | null;
  delta: number[] | null;
  normalization: StxmNormalizationWindows;
  normalizationScale: number;
  bareAtomScale: number | null;
  bareAtomOffset: number | null;
  thicknessCm: number;
  formula: string | null;
  weightingMode: StxmWeightingMode;
  kkEngineLabel: string | null;
};

export type ComputeStxmIngestionParams = {
  image: Float64Array[];
  spatial: Float64Array;
  energyEv: Float64Array;
  bounds: {
    sampleLo: number;
    sampleHi: number;
    izeroLo: number;
    izeroHi: number;
  };
  weightingMode: StxmWeightingMode;
  normalization?: StxmNormalizationWindows;
  formula?: string | null;
  thicknessCm?: number;
  bareAtomIncludeOffset?: boolean;
  runKkDelta?: boolean;
};

function toNumberArray(values: Float64Array): number[] {
  return Array.from(values);
}

/**
 * Runs the browser-side STXM ingestion reduction: region means, Beer-Lambert OD,
 * normalization, optional bare-atom mass absorption and beta, and optional KK delta.
 */
export async function computeStxmIngestion(
  params: ComputeStxmIngestionParams,
): Promise<StxmIngestionResult> {
  const { sampleMask, izeroMask } = sampleIzeroMasks(
    params.spatial,
    params.bounds.sampleLo,
    params.bounds.sampleHi,
    params.bounds.izeroLo,
    params.bounds.izeroHi,
  );
  const beer = nexafsBeerLambert(
    params.image,
    sampleMask,
    izeroMask,
    params.weightingMode,
  );
  const normalization =
    params.normalization ?? suggestNormalizationWindows(params.energyEv);
  const { odNormalized, metadata } = normalizeNexafsOd(
    params.energyEv,
    beer.od,
    normalization,
  );

  const thicknessCm = params.thicknessCm ?? 1e-4;
  const formulaRaw = params.formula?.trim();
  const formula = formulaRaw?.length ? formulaRaw : null;
  let massAbsorption: number[] | null = null;
  let massAbsorptionErr: number[] | null = null;
  let beta: number[] | null = null;
  let betaErr: number[] | null = null;
  let delta: number[] | null = null;
  let bareAtomScale: number | null = null;
  let bareAtomOffset: number | null = null;
  let kkEngineLabel: string | null = null;

  if (formula) {
    const spectrumPoints = toNumberArray(params.energyEv).map((energy) => ({
      energy,
      absorption: 0,
    }));
    const bareMuPoints = await calculateBareAtomAbsorption(
      formula,
      spectrumPoints,
    );
    const muMassAbs = Float64Array.from(
      bareMuPoints.map((point) => point.absorption),
    );
    const fit = fitBareAtomBackground(
      params.energyEv,
      beer.od,
      muMassAbs,
      5,
      params.bareAtomIncludeOffset ?? true,
    );
    bareAtomScale = fit.scale;
    bareAtomOffset = fit.offset;
    const mass = massAbsorptionFromOdFit(beer.od, beer.sigmaOd, fit);
    massAbsorption = toNumberArray(mass.massAbsorption);
    massAbsorptionErr = toNumberArray(mass.massAbsorptionErr);
    const betaBare = bareAtomBetaFromMassAbsorption(params.energyEv, muMassAbs);
    const betaValues = betaFromNormalizedMassAbsorption(
      mass.massAbsorption,
      muMassAbs,
      betaBare,
    );
    beta = toNumberArray(betaValues);
    const betaErrValues = betaFromNormalizedMassAbsorption(
      mass.massAbsorptionErr,
      muMassAbs,
      betaBare,
    );
    betaErr = toNumberArray(betaErrValues);

    if (params.runKkDelta !== false && beta.length >= 4) {
      if (!readKkBrowserConsentGranted()) {
        throw new Error("KK_CONSENT_REQUIRED");
      }
      delta = computeDeltaFromBetaKkcalcStyle({
        energyEv: toNumberArray(params.energyEv),
        beta,
        stoichiometryFormula: formula,
        densityGPerCm3: DEFAULT_KK_MASS_DENSITY_G_CM3,
        henkeMergeDomain: [normalization.preLo, normalization.postHi],
      });
      kkEngineLabel = "kkcalc2-browser";
    }
  } else {
    const betaValues = odToBeta(params.energyEv, beer.od, thicknessCm);
    beta = toNumberArray(betaValues);
    betaErr = toNumberArray(
      odErrToBetaErr(params.energyEv, beer.sigmaOd, thicknessCm),
    );
  }

  return {
    energyEv: toNumberArray(params.energyEv),
    i0: toNumberArray(beer.i0),
    i0Err: toNumberArray(beer.sigmaI0),
    iSample: toNumberArray(beer.iSample),
    iSampleErr: toNumberArray(beer.sigmaI),
    od: toNumberArray(beer.od),
    odErr: toNumberArray(beer.sigmaOd),
    odNormalized: toNumberArray(odNormalized),
    massAbsorption,
    massAbsorptionErr,
    beta,
    betaErr,
    delta,
    normalization,
    normalizationScale: metadata.postEdgeScale,
    bareAtomScale,
    bareAtomOffset,
    thicknessCm,
    formula,
    weightingMode: params.weightingMode,
    kkEngineLabel,
  };
}

/** Exposes raw region mean spectra (signal) without Beer-Lambert for display toggles. */
export function computeRegionSignalSpectra(
  image: Float64Array[],
  spatial: Float64Array,
  bounds: ComputeStxmIngestionParams["bounds"],
  weightingMode: StxmWeightingMode,
): { i0: Float64Array; iSample: Float64Array } {
  const { sampleMask, izeroMask } = sampleIzeroMasks(
    spatial,
    bounds.sampleLo,
    bounds.sampleHi,
    bounds.izeroLo,
    bounds.izeroHi,
  );
  return {
    i0: regionSumAndSigma(image, izeroMask, weightingMode).sum,
    iSample: regionSumAndSigma(image, sampleMask, weightingMode).sum,
  };
}

export { grantKkBrowserConsent, readKkBrowserConsentGranted };
