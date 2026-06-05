import type { StxmIngestionDisplayChannel } from "~/features/dashboard/lib/computeStxmIngestion";
import type { StxmIngestionResult } from "~/features/dashboard/lib/computeStxmIngestion";
import type { StxmWeightingMode } from "./estimators";
import type {
  StxmPlotScaleMode,
  StxmRegionSpectrumSeries,
} from "./stxm-region-types";
import {
  applyStxmRawSignalTransform,
  applyStxmRawSignalTransformError,
  type StxmRawSignalTransformMode,
} from "./stxm-raw-signal-transform";

export type { StxmRawSignalTransformMode } from "./stxm-raw-signal-transform";
export { migrateStxmRawSignalTransformMode } from "./stxm-raw-signal-transform";

export type StxmIngestionPlotChannel =
  | StxmIngestionDisplayChannel
  | "f1"
  | "chi"
  | "bare_atom";

export type StxmIngestionChannelOption = {
  id: StxmIngestionPlotChannel;
  label: string;
};

/** Raw spectroscopy tray: incident, transmitted, TEY drain, and reduced OD views. */
export const STXM_INGESTION_RAW_SPECTROSCOPY_CHANNEL_OPTIONS: StxmIngestionChannelOption[] =
  [
    { id: "signal_i0", label: "I0" },
    { id: "signal_it", label: "It" },
    { id: "signal_ie", label: "Ie" },
    { id: "od", label: "OD" },
    { id: "od_normalized", label: "Norm OD" },
    { id: "mass_absorption", label: "Mass abs" },
  ];

/** Optical-constant and bare-atom reduced channels. */
export const STXM_INGESTION_REDUCED_CHANNEL_OPTIONS: StxmIngestionChannelOption[] =
  [
    { id: "beta", label: "Beta" },
    { id: "delta", label: "Delta" },
    { id: "f1", label: "f1" },
    { id: "chi", label: "chi" },
  ];

export const STXM_INGESTION_CHANNEL_OPTIONS: StxmIngestionChannelOption[] = [
  ...STXM_INGESTION_RAW_SPECTROSCOPY_CHANNEL_OPTIONS,
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

/**
 * Returns true when the channel is a raw summed intensity (I0, It, or Ie) that accepts
 * the signal / reciprocal / log-reciprocal transform group.
 */
export function ingestionChannelUsesRawIntensity(
  channel: StxmIngestionPlotChannel,
): boolean {
  return (
    channel === "signal_i0" ||
    channel === "signal_it" ||
    channel === "signal_ie"
  );
}

/** @deprecated Use {@link ingestionChannelUsesRawIntensity}. */
export function ingestionChannelUsesRawSignal(
  channel: StxmIngestionPlotChannel,
): boolean {
  return ingestionChannelUsesRawIntensity(channel);
}

/** Raw intensity channels always plot on a linear axis; transforms apply to Y values directly. */
export function resolveStxmPlotYScale(
  channel: StxmIngestionPlotChannel,
  _rawSignalTransform: StxmRawSignalTransformMode,
): StxmPlotScaleMode {
  if (ingestionChannelUsesRawIntensity(channel)) {
    return "linear";
  }
  return "linear";
}

export function ingestionChannelYAxisLabel(
  channel: StxmIngestionPlotChannel,
  rawSignalTransform: StxmRawSignalTransformMode = "signal",
): string {
  if (ingestionChannelUsesRawIntensity(channel)) {
    switch (rawSignalTransform) {
      case "reciprocal":
        return "1 / signal";
      case "log_reciprocal":
        return "log10(1 / signal)";
      default:
        return "Signal (counts)";
    }
  }
  switch (channel) {
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
    case "signal_it":
      return result.iSample[index] ?? Number.NaN;
    case "signal_ie":
      return result.iTe?.[index] ?? Number.NaN;
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
  if (
    channel === "signal_i0" ||
    channel === "signal_it" ||
    channel === "signal_ie"
  ) {
    if (channel === "signal_ie") {
      return series.teyDrain?.[index] ?? Number.NaN;
    }
    return series.signal[index] ?? Number.NaN;
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

/**
 * Applies raw-intensity transform to a scalar value when the channel is I0, It, or Ie.
 */
export function transformStxmRawIntensityY(
  value: number,
  channel: StxmIngestionPlotChannel,
  rawSignalTransform: StxmRawSignalTransformMode,
): number {
  if (!ingestionChannelUsesRawIntensity(channel)) {
    return value;
  }
  return applyStxmRawSignalTransform(value, rawSignalTransform);
}

/**
 * Propagates error through raw-intensity transform when the channel is I0, It, or Ie.
 */
export function transformStxmRawIntensityErrorY(
  error: number | undefined,
  value: number,
  channel: StxmIngestionPlotChannel,
  rawSignalTransform: StxmRawSignalTransformMode,
): number | undefined {
  if (!ingestionChannelUsesRawIntensity(channel)) {
    return error;
  }
  return applyStxmRawSignalTransformError(value, error, rawSignalTransform);
}
