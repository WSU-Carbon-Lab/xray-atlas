/**
 * Constrained linear combination fitting (LCF) for NEXAFS/STXM spectra in the browser.
 *
 * Aligns target and reference spectra onto a shared energy grid, then solves a weighted
 * least-squares blend with optional non-negativity, sum-to-one, bounds, and fixed components.
 */

import {
  commonEnergyGrid,
  interpolateSpectrumLinear,
  sigmaWithFloor,
} from "./lcf-spectrum-grid";

/** Spectrum samples on an energy axis for LCF. */
export interface LcfSpectrum {
  energyEv: readonly number[];
  values: readonly number[];
  sigma: readonly number[];
  label: string;
}

/** Per-component fraction bounds; `null` means unbounded on that side. */
export type LcfFractionBound = readonly [number | null, number | null];

/** Options controlling the constrained linear combination fit. */
export interface LcfFitOptions {
  /** When true, lower bounds are clipped to at least zero (default true). */
  nonNegative?: boolean;
  /** When true, optimized fractions sum to one (default false). */
  sumToOne?: boolean;
  /** Common energy grid in eV; built from overlap when omitted. */
  energyGrid?: readonly number[];
  /** Starting fractions aligned with references; also used for fixed components. */
  initialFractions?: readonly number[];
  /** Per-component `(lower, upper)` bounds in fraction units. */
  fractionBounds?: readonly LcfFractionBound[];
  /** When `fixed[i]` is true, `initialFractions[i]` is held during the fit. */
  fixed?: readonly boolean[];
}

/** Outcome of a linear combination fit on the shared energy grid. */
export interface LcfFitResult {
  fractions: number[];
  reducedChiSquare: number;
  residual: number[];
  model: number[];
  targetOnGrid: number[];
  energyGrid: number[];
  referenceLabels: string[];
}

type PreparedLcfGrid = {
  energyGrid: number[];
  target: number[];
  sigma: number[];
  design: number[][];
};

function defaultInitialFractions(nRef: number, sumToOne: boolean): number[] {
  if (sumToOne && nRef > 0) {
    return Array.from({ length: nRef }, () => 1 / nRef);
  }
  return Array.from({ length: nRef }, () => 0);
}

function defaultFractionBounds(
  nRef: number,
  nonNegative: boolean,
): LcfFractionBound[] {
  if (nonNegative) {
    return Array.from({ length: nRef }, () => [0, 1] as const);
  }
  return Array.from({ length: nRef }, () => [null, null] as const);
}

function validateLcfInputs(
  nRef: number,
  initialFractions: readonly number[],
  fractionBounds: readonly LcfFractionBound[],
  fixed: readonly boolean[],
): void {
  if (initialFractions.length !== nRef) {
    throw new RangeError("initialFractions length must match references");
  }
  if (fractionBounds.length !== nRef) {
    throw new RangeError("fractionBounds length must match references");
  }
  if (fixed.length !== nRef) {
    throw new RangeError("fixed length must match references");
  }
  for (let index = 0; index < nRef; index += 1) {
    const value = initialFractions[index]!;
    const [lo, hi] = fractionBounds[index]!;
    if (lo != null && value < lo - 1e-12) {
      throw new RangeError(
        `initialFractions[${index}]=${value} below bound minimum ${lo}`,
      );
    }
    if (hi != null && value > hi + 1e-12) {
      throw new RangeError(
        `initialFractions[${index}]=${value} above bound maximum ${hi}`,
      );
    }
    if (fixed[index] && !Number.isFinite(value)) {
      throw new RangeError(`fixed component ${index} requires finite initial_fraction`);
    }
  }
}

/**
 * Builds the weighted design matrix on the common energy grid shared by target and references.
 *
 * @throws {RangeError} When grids do not overlap or no finite samples remain after masking.
 */
export function prepareLcfGrid(
  target: LcfSpectrum,
  references: readonly LcfSpectrum[],
  energyGrid?: readonly number[],
): PreparedLcfGrid {
  const grids = [
    target.energyEv,
    ...references.map((reference) => reference.energyEv),
  ];
  let grid =
    energyGrid != null
      ? [...energyGrid]
      : commonEnergyGrid(grids);
  const y = interpolateSpectrumLinear(target.energyEv, target.values, grid);
  const sigma = sigmaWithFloor(
    interpolateSpectrumLinear(target.energyEv, target.sigma, grid),
  );
  const designColumns = references.map((reference) =>
    interpolateSpectrumLinear(reference.energyEv, reference.values, grid),
  );
  const valid = y.map((value, index) => {
    if (!Number.isFinite(value) || !Number.isFinite(sigma[index]!)) {
      return false;
    }
    return designColumns.every((column) => Number.isFinite(column[index]!));
  });
  if (!valid.some(Boolean)) {
    throw new RangeError("no finite points on the common energy grid");
  }
  grid = grid.filter((_, index) => valid[index]!);
  const maskedTarget = y.filter((_, index) => valid[index]!);
  const maskedSigma = sigma.filter((_, index) => valid[index]!);
  const maskedDesign = designColumns.map((column) =>
    column.filter((_, index) => valid[index]!),
  );
  return {
    energyGrid: grid,
    target: maskedTarget,
    sigma: maskedSigma,
    design: maskedDesign,
  };
}

function clipToBounds(value: number, bound: LcfFractionBound): number {
  let next = value;
  const [lo, hi] = bound;
  if (lo != null) {
    next = Math.max(lo, next);
  }
  if (hi != null) {
    next = Math.min(hi, next);
  }
  return next;
}

function gradientWeightedLeastSquares(
  fractions: readonly number[],
  target: readonly number[],
  sigma: readonly number[],
  design: readonly number[][],
  out: number[],
): void {
  out.fill(0);
  for (let row = 0; row < target.length; row += 1) {
    let model = 0;
    for (let col = 0; col < fractions.length; col += 1) {
      model += design[col]![row]! * fractions[col]!;
    }
    const resid = target[row]! - model;
    const weight = 2 / (sigma[row]! * sigma[row]!);
    for (let col = 0; col < fractions.length; col += 1) {
      out[col]! -= weight * resid * design[col]![row]!;
    }
  }
}

function solveWeightedNnls(
  design: readonly number[][],
  target: readonly number[],
  weights: readonly number[],
): number[] {
  const nRef = design.length;
  const nRows = target.length;
  if (nRef === 0 || nRows === 0) {
    return [];
  }
  const ata: number[][] = Array.from({ length: nRef }, () =>
    Array.from({ length: nRef }, () => 0),
  );
  const atb = Array.from({ length: nRef }, () => 0);
  for (let row = 0; row < nRows; row += 1) {
    const weight = weights[row]!;
    for (let col = 0; col < nRef; col += 1) {
      const aCol = design[col]![row]! * weight;
      atb[col]! += aCol * target[row]!;
      for (let inner = 0; inner < nRef; inner += 1) {
        ata[col]![inner]! += aCol * design[inner]![row]!;
      }
    }
  }
  return lawsonHansonNnls(ata, atb);
}

function lawsonHansonNnls(a: readonly number[][], b: readonly number[]): number[] {
  const n = a.length;
  const x = Array.from({ length: n }, () => 0);
  const passive = Array.from({ length: n }, () => false);
  const w = Array.from({ length: n }, () => 0);
  const maxIter = 3 * n;
  for (let iter = 0; iter < maxIter; iter += 1) {
    for (let index = 0; index < n; index += 1) {
      w[index] = b[index]!;
      for (let inner = 0; inner < n; inner += 1) {
        if (!passive[inner]) {
          continue;
        }
        w[index]! -= a[index]![inner]! * x[inner]!;
      }
    }
    let enter = -1;
    let maxW = 0;
    for (let index = 0; index < n; index += 1) {
      if (!passive[index] && w[index]! > maxW + 1e-15) {
        maxW = w[index]!;
        enter = index;
      }
    }
    if (enter < 0) {
      break;
    }
    passive[enter] = true;
    while (true) {
      const activeIndices = passive
        .map((isActive, index) => (isActive ? index : -1))
        .filter((index) => index >= 0);
      const subA = activeIndices.map((rowIndex) =>
        activeIndices.map((colIndex) => a[rowIndex]![colIndex]!),
      );
      const subB = activeIndices.map((rowIndex) => b[rowIndex]!);
      const subX = solveUnconstrainedLeastSquares(subA, subB);
      let negative = false;
      for (const subValue of subX) {
        if (subValue < -1e-12) {
          negative = true;
          break;
        }
      }
      if (!negative) {
        for (let local = 0; local < activeIndices.length; local += 1) {
          x[activeIndices[local]!] = subX[local]!;
        }
        break;
      }
      let alpha = Infinity;
      for (let local = 0; local < activeIndices.length; local += 1) {
        const global = activeIndices[local]!;
        if (subX[local]! < 0) {
          alpha = Math.min(alpha, x[global]! / (x[global]! - subX[local]!));
        }
      }
      for (let local = 0; local < activeIndices.length; local += 1) {
        const global = activeIndices[local]!;
        x[global] = x[global]! + alpha * (subX[local]! - x[global]!);
      }
      for (let index = 0; index < n; index += 1) {
        if (passive[index] && x[index]! <= 1e-12) {
          passive[index] = false;
          x[index] = 0;
        }
      }
    }
  }
  return x;
}

function solveUnconstrainedLeastSquares(
  a: readonly number[][],
  b: readonly number[],
): number[] {
  const n = a.length;
  if (n === 0) {
    return [];
  }
  const m = a[0]?.length ?? 0;
  const ata: number[][] = Array.from({ length: m }, () =>
    Array.from({ length: m }, () => 0),
  );
  const atb = Array.from({ length: m }, () => 0);
  for (let row = 0; row < n; row += 1) {
    for (let col = 0; col < m; col += 1) {
      atb[col]! += a[row]![col]! * b[row]!;
      for (let inner = 0; inner < m; inner += 1) {
        ata[col]![inner]! += a[row]![col]! * a[row]![inner]!;
      }
    }
  }
  return solveSymmetricSystem(ata, atb);
}

function solveSymmetricSystem(a: readonly number[][], b: readonly number[]): number[] {
  const n = b.length;
  const matrix = a.map((row) => [...row]);
  const rhs = [...b];
  for (let pivot = 0; pivot < n; pivot += 1) {
    let maxRow = pivot;
    for (let row = pivot + 1; row < n; row += 1) {
      if (Math.abs(matrix[row]![pivot]!) > Math.abs(matrix[maxRow]![pivot]!)) {
        maxRow = row;
      }
    }
    [matrix[pivot], matrix[maxRow]] = [matrix[maxRow]!, matrix[pivot]!];
    [rhs[pivot], rhs[maxRow]] = [rhs[maxRow]!, rhs[pivot]!];
    const diag = matrix[pivot]![pivot]!;
    if (Math.abs(diag) < 1e-15) {
      continue;
    }
    for (let row = pivot + 1; row < n; row += 1) {
      const factor = matrix[row]![pivot]! / diag;
      for (let col = pivot; col < n; col += 1) {
        matrix[row]![col]! -= factor * matrix[pivot]![col]!;
      }
      rhs[row]! -= factor * rhs[pivot]!;
    }
  }
  const x = Array.from({ length: n }, () => 0);
  for (let row = n - 1; row >= 0; row -= 1) {
    let sum = rhs[row]!;
    for (let col = row + 1; col < n; col += 1) {
      sum -= matrix[row]![col]! * x[col]!;
    }
    const diag = matrix[row]![row]!;
    x[row] = Math.abs(diag) < 1e-15 ? 0 : sum / diag;
  }
  return x;
}

function fitSimplexWeightedLeastSquares(
  design: readonly number[][],
  target: readonly number[],
  weights: readonly number[],
): number[] {
  const nRef = design.length;
  if (nRef === 1) {
    return [1];
  }
  const anchor = design[nRef - 1]!;
  const reducedDesign: number[][] = [];
  for (let col = 0; col < nRef - 1; col += 1) {
    reducedDesign.push(
      design[col]!.map((value, row) => value - anchor[row]!),
    );
  }
  const reducedTarget = target.map((value, row) => value - anchor[row]!);
  const free = solveWeightedNnls(reducedDesign, reducedTarget, weights);
  const anchorFraction = Math.max(
    0,
    1 - free.reduce((sum, value) => sum + value, 0),
  );
  return [...free, anchorFraction];
}

function optimizeConstrainedLcf(params: {
  nRef: number;
  target: readonly number[];
  sigma: readonly number[];
  design: readonly number[][];
  xInit: readonly number[];
  bounds: readonly LcfFractionBound[];
  fixed: readonly boolean[];
  sumToOne: boolean;
  nonNegative: boolean;
}): number[] {
  const freeIndices = params.fixed
    .map((isFixed, index) => (isFixed ? -1 : index))
    .filter((index) => index >= 0);
  const fixedSum = params.fixed.reduce(
    (sum, isFixed, index) =>
      isFixed ? sum + params.xInit[index]! : sum,
    0,
  );
  if (params.sumToOne && fixedSum > 1 + 1e-9) {
    throw new RangeError("fixed fractions sum exceeds one under sum_to_one");
  }
  if (freeIndices.length === 0) {
    return [...params.xInit];
  }

  const weights = params.sigma.map((value) => 1 / (value * value));
  if (
    params.sumToOne &&
    params.nonNegative &&
    params.fixed.every((value) => !value)
  ) {
    return fitSimplexWeightedLeastSquares(
      params.design,
      params.target,
      weights,
    );
  }
  if (
    !params.sumToOne &&
    params.nonNegative &&
    freeIndices.length === params.nRef &&
    params.fixed.every((value) => !value)
  ) {
    return solveWeightedNnls(params.design, params.target, weights);
  }

  const x = [...params.xInit];
  const gradient = Array.from({ length: params.nRef }, () => 0);
  const learningRate = 0.05;
  for (let iter = 0; iter < 400; iter += 1) {
    gradientWeightedLeastSquares(x, params.target, params.sigma, params.design, gradient);
    for (const index of freeIndices) {
      x[index] = clipToBounds(
        x[index]! - learningRate * gradient[index]!,
        params.bounds[index]!,
      );
      if (params.nonNegative) {
        const current = x[index] ?? 0;
        x[index] = Math.max(0, current);
      }
    }
    if (params.sumToOne) {
      const adjustableSum = freeIndices.reduce((sum, index) => sum + x[index]!, 0);
      const desired = 1 - fixedSum;
      if (adjustableSum > 1e-12 && Math.abs(adjustableSum - desired) > 1e-9) {
        const scale = desired / adjustableSum;
        for (const index of freeIndices) {
          x[index] = clipToBounds(x[index]! * scale, params.bounds[index]!);
          if (params.nonNegative) {
            const scaled = x[index] ?? 0;
            x[index] = Math.max(0, scaled);
          }
        }
      }
    }
  }
  return x;
}

/**
 * Builds a linear-combination model on the common energy grid for UI preview.
 *
 * @param target - Unknown spectrum to display alongside the model.
 * @param references - Basis spectra; must be non-empty.
 * @param fractions - Component weights aligned with `references`.
 * @param energyGrid - Optional common grid; built from overlap when omitted.
 * @param normalizeFractions - When true and the fraction sum is non-zero and not unity, scale to sum to one.
 */
export function previewLcfModel(
  target: LcfSpectrum,
  references: readonly LcfSpectrum[],
  fractions: readonly number[],
  energyGrid?: readonly number[],
  normalizeFractions = true,
): {
  energyGrid: number[];
  model: number[];
  targetOnGrid: number[];
} {
  if (references.length === 0) {
    throw new RangeError("references must be non-empty");
  }
  if (fractions.length !== references.length) {
    throw new RangeError("fractions length must match references");
  }
  const prepared = prepareLcfGrid(target, references, energyGrid);
  let fracs = [...fractions];
  if (normalizeFractions) {
    const total = fracs.reduce((sum, value) => sum + value, 0);
    if (total !== 0 && Math.abs(total - 1) > 1e-9) {
      fracs = fracs.map((value) => value / total);
    }
  }
  const model = prepared.target.map((_, row) =>
    fracs.reduce(
      (sum, fraction, col) => sum + fraction * prepared.design[col]![row]!,
      0,
    ),
  );
  return {
    energyGrid: prepared.energyGrid,
    model,
    targetOnGrid: prepared.target,
  };
}

/**
 * Fits `target` as a weighted linear combination of `references` on their energy overlap.
 *
 * @param target - Unknown spectrum with uncertainties on `sigma`.
 * @param references - Basis spectra; must be non-empty.
 * @param options - Constraints and optional starting fractions.
 * @returns Fractions, reduced chi-square, model, residual, and the energy grid used.
 * @throws {RangeError} When references are empty, grids do not overlap, or inputs mismatch.
 */
export function fitLcf(
  target: LcfSpectrum,
  references: readonly LcfSpectrum[],
  options: LcfFitOptions = {},
): LcfFitResult {
  if (references.length === 0) {
    throw new RangeError("references must be non-empty");
  }
  const nonNegative = options.nonNegative ?? true;
  const sumToOne = options.sumToOne ?? false;
  const nRef = references.length;
  const prepared = prepareLcfGrid(target, references, options.energyGrid);
  const xInit =
    options.initialFractions != null
      ? [...options.initialFractions]
      : defaultInitialFractions(nRef, sumToOne);
  const bounds =
    options.fractionBounds != null
      ? [...options.fractionBounds]
      : defaultFractionBounds(nRef, nonNegative);
  const fixed = options.fixed != null ? [...options.fixed] : Array.from({ length: nRef }, () => false);
  validateLcfInputs(nRef, xInit, bounds, fixed);

  const fractions = optimizeConstrainedLcf({
    nRef,
    target: prepared.target,
    sigma: prepared.sigma,
    design: prepared.design,
    xInit,
    bounds,
    fixed,
    sumToOne,
    nonNegative,
  });

  const model = prepared.target.map((_, row) =>
    fractions.reduce(
      (sum, fraction, col) => sum + fraction * prepared.design[col]![row]!,
      0,
    ),
  );
  const residual = prepared.target.map((value, row) => value - model[row]!);
  const nFree = fixed.filter((value) => !value).length;
  const dof = Math.max(prepared.energyGrid.length - nFree, 1);
  const chi2 = residual.reduce(
    (sum, value, row) => sum + (value / prepared.sigma[row]!) ** 2,
    0,
  );
  return {
    fractions,
    reducedChiSquare: chi2 / dof,
    residual,
    model,
    targetOnGrid: prepared.target,
    energyGrid: prepared.energyGrid,
    referenceLabels: references.map(
      (reference, index) => reference.label || `ref_${index}`,
    ),
  };
}

/**
 * Normalizes component weights for preview or warm-start when `sumToOne` is enabled.
 *
 * @param weights - Raw slider or guess values aligned with reference count.
 * @param sumToOne - When true, divides by the positive sum so weights sum to one; when false, returns a copy.
 */
export function normalizeLcfInitialWeights(
  weights: readonly number[],
  sumToOne: boolean,
): number[] {
  const clipped = weights.map((value) =>
    Number.isFinite(value) ? Math.max(0, value) : 0,
  );
  if (!sumToOne) {
    return clipped;
  }
  const total = clipped.reduce((sum, value) => sum + value, 0);
  if (total <= 1e-15) {
    return clipped.length > 0
      ? Array.from({ length: clipped.length }, () => 1 / clipped.length)
      : [];
  }
  return clipped.map((value) => value / total);
}

/**
 * Fits one reference spectrum to the target with a single non-negative scale factor (no sum constraint).
 *
 * @param target - Unknown spectrum to match.
 * @param reference - Single basis spectrum.
 * @param options - Optional shared energy grid.
 * @returns {@link LcfFitResult} with `fractions[0]` equal to the optimal scale.
 */
export function fitSingleReferenceScale(
  target: LcfSpectrum,
  reference: LcfSpectrum,
  options: Pick<LcfFitOptions, "energyGrid"> = {},
): LcfFitResult {
  const prepared = prepareLcfGrid(target, [reference], options.energyGrid);
  const ref = prepared.design[0]!;
  let numerator = 0;
  let denominator = 0;
  for (let row = 0; row < prepared.target.length; row += 1) {
    const weight = 1 / (prepared.sigma[row]! * prepared.sigma[row]!);
    const refValue = ref[row]!;
    const targetValue = prepared.target[row]!;
    numerator += weight * refValue * targetValue;
    denominator += weight * refValue * refValue;
  }
  const scale =
    denominator > 1e-15 ? Math.max(0, numerator / denominator) : 0;
  const model = ref.map((value) => value * scale);
  const residual = prepared.target.map((value, row) => value - model[row]!);
  const chi2 = residual.reduce(
    (sum, value, row) => sum + (value / prepared.sigma[row]!) ** 2,
    0,
  );
  const dof = Math.max(prepared.energyGrid.length - 1, 1);
  return {
    fractions: [scale],
    reducedChiSquare: chi2 / dof,
    residual,
    model,
    targetOnGrid: prepared.target,
    energyGrid: prepared.energyGrid,
    referenceLabels: [reference.label || "ref_0"],
  };
}

/**
 * Builds target, model, per-component scaled traces, and residual for LC plot overlays.
 *
 * @param target - Unknown spectrum shown as the primary trace.
 * @param references - Basis spectra aligned with `fractions`.
 * @param fractions - Component weights or scale factors aligned with `references`.
 * @param energyGrid - Optional shared grid; overlap grid is used when omitted.
 */
export function buildLcfPlotOverlay(
  target: LcfSpectrum,
  references: readonly LcfSpectrum[],
  fractions: readonly number[],
  energyGrid?: readonly number[],
): {
  energyGrid: number[];
  targetOnGrid: number[];
  model: number[];
  residual: number[];
  scaledComponents: number[][];
} {
  const preview = previewLcfModel(
    target,
    references,
    fractions,
    energyGrid,
    false,
  );
  const prepared = prepareLcfGrid(target, references, preview.energyGrid);
  const scaledComponents = references.map((_, index) =>
    prepared.design[index]!.map((value) => value * (fractions[index] ?? 0)),
  );
  const residual = preview.targetOnGrid.map(
    (value, row) => value - preview.model[row]!,
  );
  return {
    energyGrid: preview.energyGrid,
    targetOnGrid: preview.targetOnGrid,
    model: preview.model,
    residual,
    scaledComponents,
  };
}

/**
 * Computes the default energy overlap interval for one target and multiple references.
 *
 * @returns `[minEv, maxEv]` on the shared overlap, or `null` when axes do not overlap.
 */
export function lcfEnergyOverlapRange(
  target: LcfSpectrum,
  references: readonly LcfSpectrum[],
): [number, number] | null {
  try {
    const grid = commonEnergyGrid([
      target.energyEv,
      ...references.map((reference) => reference.energyEv),
    ]);
    if (grid.length === 0) {
      return null;
    }
    return [grid[0]!, grid[grid.length - 1]!];
  } catch {
    return null;
  }
}
