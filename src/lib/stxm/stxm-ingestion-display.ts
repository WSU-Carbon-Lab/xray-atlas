import type { StxmIngestionDisplayChannel } from "~/features/dashboard/lib/computeStxmIngestion";
import type { StxmIngestionResult } from "~/features/dashboard/lib/computeStxmIngestion";
import type { StxmWeightingMode } from "./estimators";
import type { StxmRegionSpectrumSeries } from "./stxm-region-types";

export type StxmIngestionPlotChannel = StxmIngestionDisplayChannel | "f1" | "chi" | "bare_atom";

export type StxmIngestionChannelOption = {
  id: StxmIngestionPlotChannel;
  label: string;
};

/** Raw mean-signal views from per-region spectra (recomputed on weighting change). */
export const STXM_INGESTION_SIGNAL_CHANNEL_OPTIONS: StxmIngestionChannelOption[] = [
  { id: "signal_i0", label: "I0" },
  { id: "signal_sample", label: "Sample" },
  { id: "signal_inv_i0", label: "1/I0" },
];

/** Reduced pipeline channels (OD, optical constants, bare atom). */
export const STXM_INGESTION_REDUCED_CHANNEL_OPTIONS: StxmIngestionChannelOption[] = [
  { id: "od", label: "OD" },
  { id: "od_normalized", label: "Norm OD" },
  { id: "mass_absorption", label: "Mass abs" },
  { id: "beta", label: "Beta" },
  { id: "delta", label: "Delta" },
  { id: "f1", label: "f1" },
  { id: "chi", label: "chi" },
  { id: "bare_atom", label: "Bare atom" },
];

export const STXM_INGESTION_CHANNEL_OPTIONS: StxmIngestionChannelOption[] = [
  ...STXM_INGESTION_SIGNAL_CHANNEL_OPTIONS,
  ...STXM_INGESTION_REDUCED_CHANNEL_OPTIONS,
];

/** Weighting estimators for raw region spectra (Poisson MLE, inverse count, empirical). */
export const STXM_INGESTION_WEIGHTING_OPTIONS: Array<{
  id: StxmWeightingMode;
  label: string;
}> = [
  { id: "poisson_mle", label: "Poisson MLE" },
  { id: "inverse_count", label: "Inverse count" },
  { id: "empirical", label: "Empirical" },
];

const SIGNAL_INVERSE_MIN = 1e-12;

export function ingestionChannelUsesRawSignal(
  channel: StxmIngestionPlotChannel,
): boolean {
  return (
    channel === "signal_i0" ||
    channel === "signal_sample" ||
    channel === "signal_inv_i0"
  );
}

export function ingestionChannelAllowsLogY(
  channel: StxmIngestionPlotChannel,
): boolean {
  return ingestionChannelUsesRawSignal(channel);
}

export function ingestionChannelYAxisLabel(channel: StxmIngestionPlotChannel): string {
  switch (channel) {
    case "signal_i0":
    case "signal_sample":
      return "Mean signal";
    case "signal_inv_i0":
      return "1 / mean signal";
    case "od":
      return "OD (ln I0/I)";
    case "od_normalized":
      return "OD normalized";
    case "mass_absorption":
      return "Mass abs (g/cm^2)";
    case "beta":
      return "Beta";
    case "delta":
      return "Delta";
    case "f1":
      return "f1 (KK delta)";
    case "chi":
      return "chi (beta proxy)";
    case "bare_atom":
      return "Bare atom mass abs";
    default:
      return "Intensity";
  }
}

function signalInverse(signal: number): number {
  if (!Number.isFinite(signal)) {
    return Number.NaN;
  }
  return 1 / Math.max(signal, SIGNAL_INVERSE_MIN);
}

/**
 * Reads the scalar Y value for a reduced ingestion result at one energy index.
 */
export function ingestionResultChannelValue(
  result: StxmIngestionResult,
  channel: StxmIngestionPlotChannel,
  index: number,
): number {
  switch (channel) {
    case "signal_i0":
      return result.i0[index] ?? Number.NaN;
    case "signal_sample":
      return result.iSample[index] ?? Number.NaN;
    case "signal_inv_i0":
      return signalInverse(result.i0[index] ?? Number.NaN);
    case "od":
      return result.od[index] ?? Number.NaN;
    case "od_normalized":
      return result.odNormalized[index] ?? Number.NaN;
    case "mass_absorption":
      return result.massAbsorption?.[index] ?? Number.NaN;
    case "beta":
      return result.beta?.[index] ?? Number.NaN;
    case "delta":
      return result.delta?.[index] ?? Number.NaN;
    case "f1":
      return result.delta?.[index] ?? Number.NaN;
    case "chi":
      return result.beta?.[index] ?? Number.NaN;
    case "bare_atom":
      return result.massAbsorption?.[index] ?? Number.NaN;
    default:
      return Number.NaN;
  }
}

/**
 * Reads the scalar Y value for a per-region raw spectrum at one energy index.
 */
export function regionSpectrumChannelValue(
  series: StxmRegionSpectrumSeries,
  channel: StxmIngestionPlotChannel,
  index: number,
): number {
  if (channel === "signal_i0" || channel === "signal_sample" || channel === "signal_inv_i0") {
    const signal = series.signal[index] ?? Number.NaN;
    if (channel === "signal_inv_i0") {
      return signalInverse(signal);
    }
    return signal;
  }
  if (channel === "od") {
    return series.od?.[index] ?? Number.NaN;
  }
  if (channel === "od_normalized") {
    return series.odNormalized?.[index] ?? Number.NaN;
  }
  if (channel === "mass_absorption" || channel === "bare_atom") {
    return series.massAbsorption?.[index] ?? Number.NaN;
  }
  if (channel === "beta" || channel === "chi") {
    return series.beta?.[index] ?? Number.NaN;
  }
  if (channel === "delta" || channel === "f1") {
    return series.delta?.[index] ?? Number.NaN;
  }
  return series.signal[index] ?? Number.NaN;
}
