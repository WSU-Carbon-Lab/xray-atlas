import {
  energyRegionMask,
  HC_EV_CM,
  type StxmNormalizationWindows,
} from "./normalization";

export type BareAtomBackgroundFit = {
  scale: number;
  offset: number;
  odBare: Float64Array;
  fitMask: boolean[];
};

/**
 * Options for {@link fitBareAtomBackground}; when `windows` is set, fit points come from
 * the inclusive pre- and post-edge energy ranges instead of the scan endpoints.
 */
export type FitBareAtomBackgroundOptions = {
  /** Count of lowest- and highest-energy samples used when `windows` is omitted or yields no points. */
  nEdge?: number;
  /** When false, fits `OD ≈ scale * mu` with zero offset. */
  includeOffset?: boolean;
  /** Contributor-selected normalization windows; pre and post ranges are unioned for the fit. */
  windows?: StxmNormalizationWindows;
};

/**
 * Converts optical density to beta (imaginary part of n = 1 - delta - i beta).
 *
 * @param energyEv - Photon energies in eV.
 * @param od - Optical density ln(I0/I).
 * @param thicknessCm - Sample thickness in cm; must be positive.
 */
export function odToBeta(
  energyEv: Float64Array,
  od: Float64Array,
  thicknessCm: number,
): Float64Array {
  if (thicknessCm <= 0) {
    throw new Error("thicknessCm must be positive");
  }
  const beta = new Float64Array(energyEv.length);
  for (let i = 0; i < energyEv.length; i += 1) {
    const energy = energyEv[i] ?? 0;
    const lamCm = HC_EV_CM / energy;
    beta[i] = (od[i] ?? 0) * lamCm / (4 * Math.PI * thicknessCm);
  }
  return beta;
}

/**
 * Propagates OD uncertainty to beta using the same thickness and energy grid as {@link odToBeta}.
 */
export function odErrToBetaErr(
  energyEv: Float64Array,
  odErr: Float64Array,
  thicknessCm: number,
): Float64Array {
  const out = new Float64Array(energyEv.length);
  for (let i = 0; i < energyEv.length; i += 1) {
    const energy = energyEv[i] ?? 0;
    const lamCm = HC_EV_CM / energy;
    out[i] = (odErr[i] ?? 0) * lamCm / (4 * Math.PI * thicknessCm);
  }
  return out;
}

function collectEndpointFitIndices(
  energyCount: number,
  nEdge: number,
): number[] {
  const nLow = Math.min(nEdge, energyCount);
  const nHigh = Math.min(nEdge, energyCount);
  const fitIndices: number[] = [];
  for (let i = 0; i < nLow; i += 1) {
    fitIndices.push(i);
  }
  for (let i = Math.max(energyCount - nHigh, nLow); i < energyCount; i += 1) {
    if (!fitIndices.includes(i)) {
      fitIndices.push(i);
    }
  }
  return fitIndices;
}

function collectWindowFitIndices(
  energyEv: Float64Array,
  windows: StxmNormalizationWindows,
): number[] {
  const preMask = energyRegionMask(energyEv, windows.preLo, windows.preHi);
  const postMask = energyRegionMask(energyEv, windows.postLo, windows.postHi);
  const fitIndices: number[] = [];
  for (let i = 0; i < energyEv.length; i += 1) {
    if (preMask[i] || postMask[i]) {
      fitIndices.push(i);
    }
  }
  return fitIndices;
}

/**
 * Fits `OD ≈ scale * muMassAbs + offset` using contributor normalization windows when
 * supplied, otherwise on the lowest and highest `nEdge` energy samples.
 *
 * @param energyEv - Energy axis in eV.
 * @param od - Optical density samples.
 * @param muMassAbs - Tabulated mass absorption coefficient (cm²/g) at each energy.
 * @param options - Fit windows, endpoint count, and offset policy.
 */
export function fitBareAtomBackground(
  energyEv: Float64Array,
  od: Float64Array,
  muMassAbs: Float64Array,
  options: FitBareAtomBackgroundOptions = {},
): BareAtomBackgroundFit {
  const nEdge = options.nEdge ?? 5;
  const includeOffset = options.includeOffset ?? true;
  const n = energyEv.length;
  let fitIndices =
    options.windows != null
      ? collectWindowFitIndices(energyEv, options.windows)
      : [];
  if (fitIndices.length === 0) {
    fitIndices = collectEndpointFitIndices(n, nEdge);
  }
  const fitMask = Array.from({ length: n }, () => false);
  for (const index of fitIndices) {
    fitMask[index] = true;
  }

  let scale = 1;
  let offset = 0;
  if (fitIndices.length === 0) {
    return {
      scale,
      offset,
      odBare: Float64Array.from(muMassAbs, (mu) => scale * mu + offset),
      fitMask,
    };
  }

  if (!includeOffset) {
    let num = 0;
    let den = 0;
    for (const index of fitIndices) {
      const mu = muMassAbs[index] ?? 0;
      const y = od[index] ?? 0;
      num += mu * y;
      den += mu * mu;
    }
    scale = den === 0 ? 1 : num / den;
  } else {
    let sumMu = 0;
    let sumY = 0;
    let sumMuMu = 0;
    let sumMuY = 0;
    const k = fitIndices.length;
    for (const index of fitIndices) {
      const mu = muMassAbs[index] ?? 0;
      const y = od[index] ?? 0;
      sumMu += mu;
      sumY += y;
      sumMuMu += mu * mu;
      sumMuY += mu * y;
    }
    const denom = k * sumMuMu - sumMu * sumMu;
    if (Math.abs(denom) < 1e-30) {
      scale = 1;
      offset = 0;
    } else {
      scale = (k * sumMuY - sumMu * sumY) / denom;
      offset = (sumY - scale * sumMu) / k;
    }
  }

  const odBare = new Float64Array(n);
  for (let i = 0; i < n; i += 1) {
    odBare[i] = scale * (muMassAbs[i] ?? 0) + offset;
  }
  return { scale: scale === 0 ? 1 : scale, offset, odBare, fitMask };
}

/**
 * Computes normalized mass absorption `(OD - offset) / scale` from a bare-atom background fit.
 */
export function massAbsorptionFromOdFit(
  od: Float64Array,
  odErr: Float64Array,
  fit: Pick<BareAtomBackgroundFit, "scale" | "offset">,
): { massAbsorption: Float64Array; massAbsorptionErr: Float64Array } {
  const scale = fit.scale === 0 ? 1 : fit.scale;
  const massAbsorption = new Float64Array(od.length);
  const massAbsorptionErr = new Float64Array(od.length);
  for (let i = 0; i < od.length; i += 1) {
    massAbsorption[i] = ((od[i] ?? 0) - fit.offset) / scale;
    massAbsorptionErr[i] = Math.abs((odErr[i] ?? 0) / scale);
  }
  return { massAbsorption, massAbsorptionErr };
}

/**
 * Derives beta from normalized mass absorption and tabulated bare-atom beta reference.
 */
export function betaFromNormalizedMassAbsorption(
  muNorm: Float64Array,
  muBare: Float64Array,
  betaBare: Float64Array,
): Float64Array {
  const beta = new Float64Array(muNorm.length);
  for (let i = 0; i < muNorm.length; i += 1) {
    const muRef = muBare[i] ?? 0;
    const safeMu = muRef > 1e-30 ? muRef : 1e-30;
    beta[i] = (muNorm[i] ?? 0) * (betaBare[i] ?? 0) / safeMu;
  }
  return beta;
}

/**
 * Computes bare-atom beta reference `beta = mu * lambda / (4 pi)` from mass absorption coefficient.
 */
export function bareAtomBetaFromMassAbsorption(
  energyEv: Float64Array,
  muMassAbs: Float64Array,
): Float64Array {
  const beta = new Float64Array(energyEv.length);
  for (let i = 0; i < energyEv.length; i += 1) {
    const lamCm = HC_EV_CM / (energyEv[i] ?? 1);
    beta[i] = (muMassAbs[i] ?? 0) * lamCm / (4 * Math.PI);
  }
  return beta;
}
