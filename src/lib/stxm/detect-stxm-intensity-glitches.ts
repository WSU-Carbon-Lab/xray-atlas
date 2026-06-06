export type StxmIntensityGlitchReason =
  | "it_exceeds_i0"
  | "i0_below_neighbor_median"
  | "it_above_neighbor_median"
  | "paired_i0_it_spike";

export type StxmIntensityGlitch = {
  energyIndex: number;
  energyEv: number | null;
  reason: StxmIntensityGlitchReason;
  i0: number;
  it: number;
  neighborMedianI0: number | null;
  neighborMedianIt: number | null;
};

export type DetectStxmIntensityGlitchesOptions = {
  i0LowRatioThreshold?: number;
  itHighRatioThreshold?: number;
  requirePairedSpike?: boolean;
};

const DEFAULT_I0_LOW_RATIO = 0.55;
const DEFAULT_IT_HIGH_RATIO = 1.6;

function finitePositive(value: number | undefined): value is number {
  return value !== undefined && Number.isFinite(value) && value > 0;
}

function median(values: readonly number[]): number | null {
  if (values.length === 0) {
    return null;
  }
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) {
    return sorted[mid] ?? null;
  }
  const lo = sorted[mid - 1];
  const hi = sorted[mid];
  if (lo === undefined || hi === undefined) {
    return null;
  }
  return (lo + hi) / 2;
}

function neighborValues(
  series: readonly number[],
  index: number,
): number[] {
  const neighbors: number[] = [];
  if (index > 0) {
    const prev = series[index - 1];
    if (finitePositive(prev)) {
      neighbors.push(prev);
    }
  }
  if (index < series.length - 1) {
    const next = series[index + 1];
    if (finitePositive(next)) {
      neighbors.push(next);
    }
  }
  return neighbors;
}

function neighborMedian(
  series: readonly number[],
  index: number,
): number | null {
  return median(neighborValues(series, index));
}

/**
 * Flags per-energy STXM intensity outliers where summed I0 and It deviate from
 * robust local neighbor trends or produce physically implausible Beer-Lambert OD.
 *
 * The paired spike rule matches terminal-energy detector glitches: I0 collapses
 * while It surges at the same column index, yielding negative OD with both
 * intensities still strictly positive.
 */
export function detectStxmIntensityGlitches(
  i0: readonly number[],
  it: readonly number[],
  energyEv?: readonly number[],
  options?: DetectStxmIntensityGlitchesOptions,
): StxmIntensityGlitch[] {
  const i0LowRatio = options?.i0LowRatioThreshold ?? DEFAULT_I0_LOW_RATIO;
  const itHighRatio = options?.itHighRatioThreshold ?? DEFAULT_IT_HIGH_RATIO;
  const requirePairedSpike = options?.requirePairedSpike ?? false;
  const length = Math.min(i0.length, it.length);
  const glitches: StxmIntensityGlitch[] = [];

  for (let index = 0; index < length; index += 1) {
    const i0Value = i0[index];
    const itValue = it[index];
    if (!finitePositive(i0Value) || !finitePositive(itValue)) {
      continue;
    }

    const neighborMedianI0 = neighborMedian(i0, index);
    const neighborMedianIt = neighborMedian(it, index);
    const energy = energyEv?.[index] ?? null;

    const itExceedsI0 = itValue > i0Value;
    const i0BelowNeighbors =
      neighborMedianI0 !== null && i0Value < neighborMedianI0 * i0LowRatio;
    const itAboveNeighbors =
      neighborMedianIt !== null && itValue > neighborMedianIt * itHighRatio;
    const pairedSpike = i0BelowNeighbors && itAboveNeighbors;

    let reason: StxmIntensityGlitchReason | null = null;
    if (pairedSpike) {
      reason = "paired_i0_it_spike";
    } else if (requirePairedSpike) {
      continue;
    } else if (itExceedsI0) {
      reason = "it_exceeds_i0";
    } else if (i0BelowNeighbors) {
      reason = "i0_below_neighbor_median";
    } else if (itAboveNeighbors) {
      reason = "it_above_neighbor_median";
    }

    if (reason === null) {
      continue;
    }

    glitches.push({
      energyIndex: index,
      energyEv: energy,
      reason,
      i0: i0Value,
      it: itValue,
      neighborMedianI0,
      neighborMedianIt,
    });
  }

  return glitches;
}

/**
 * Builds a per-energy validity mask that rejects non-positive raw intensities and
 * energies flagged by {@link detectStxmIntensityGlitches}.
 */
export function buildStxmEnergyValidityMask(
  i0: readonly number[],
  it?: readonly number[],
  ie?: readonly number[],
  glitchOptions?: DetectStxmIntensityGlitchesOptions,
): boolean[] {
  const length = Math.max(i0.length, it?.length ?? 0, ie?.length ?? 0);
  const glitchIndices = new Set<number>();
  if (it !== undefined && it.length > 0) {
    for (const glitch of detectStxmIntensityGlitches(i0, it, undefined, glitchOptions)) {
      glitchIndices.add(glitch.energyIndex);
    }
  }

  const mask: boolean[] = [];
  for (let index = 0; index < length; index += 1) {
    const i0Value = i0[index] ?? Number.NaN;
    const itValue = it?.[index];
    const ieValue = ie?.[index];
    const positive =
      finitePositive(i0Value) &&
      (itValue === undefined || finitePositive(itValue)) &&
      (ieValue === undefined || finitePositive(ieValue));
    mask.push(positive && !glitchIndices.has(index));
  }
  return mask;
}
