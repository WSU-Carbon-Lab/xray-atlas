import type {
  DifferenceSpectrum,
  NormalizationRegions,
  ReferenceCurve,
  SpectrumPoint,
  SpectrumYAxisQuantity,
} from "~/components/plots/types";
import type { StxmIngestionResult } from "~/features/dashboard/lib/computeStxmIngestion";
import { channelDefinitionById } from "~/components/plots/data-rail";
import {
  ingestionChannelUsesRawSignal,
  ingestionResultChannelValue,
  regionSpectrumChannelValue,
  resolveStxmPlotYScale,
  type StxmI0PlotScaleMode,
  type StxmIngestionPlotChannel,
} from "~/lib/stxm/stxm-ingestion-display";
import { stxmBareAtomOverlaySupportedForChannel } from "~/features/dashboard/lib/stxm-bare-atom-overlay";
import { STXM_INGESTION_PLOT_DATA_RAIL_DEFINITION } from "~/lib/stxm/stxm-ingestion-plot-data-rail-config";
import type { StxmRegionSpectrumSeries } from "~/lib/stxm/stxm-region-types";

export type StxmSpectrumStandardOverlay = {
  id: string;
  label: string;
  energyEv: number[];
  values: number[];
  color: string;
  enabled: boolean;
};

export type StxmSpectrumPlotModel = {
  points: SpectrumPoint[];
  companionSpectra: DifferenceSpectrum[];
  referenceCurves: ReferenceCurve[];
  yAxisQuantity: SpectrumYAxisQuantity;
  primaryTraceLabel?: string;
  normalizationRegions?: NormalizationRegions;
  showNormalizationShading: boolean;
};

export type BuildStxmSpectrumPlotModelParams = {
  result: StxmIngestionResult | null;
  regionSpectra: StxmRegionSpectrumSeries[];
  channel: StxmIngestionPlotChannel;
  i0PlotScale: StxmI0PlotScaleMode;
  standards: StxmSpectrumStandardOverlay[];
  bareAtomCurve: ReferenceCurve | null;
  showBareAtomOverlay: boolean;
  showRegionOverlays: boolean;
  primaryTraceLabel?: string;
  pureRegionLabel?: string;
};

function applyLogY(value: number): number {
  if (!Number.isFinite(value) || value <= 0) {
    return Number.NaN;
  }
  return Math.log10(value);
}

function transformY(
  value: number,
  channel: StxmIngestionPlotChannel,
  i0PlotScale: StxmI0PlotScaleMode,
): number {
  const yScale = resolveStxmPlotYScale(channel, i0PlotScale);
  if (yScale === "log" && ingestionChannelUsesRawSignal(channel)) {
    return applyLogY(value);
  }
  return value;
}

function transformErrorY(
  error: number | undefined,
  value: number,
  channel: StxmIngestionPlotChannel,
  i0PlotScale: StxmI0PlotScaleMode,
): number | undefined {
  if (error === undefined || !Number.isFinite(error)) {
    return undefined;
  }
  const yScale = resolveStxmPlotYScale(channel, i0PlotScale);
  if (yScale === "log" && ingestionChannelUsesRawSignal(channel)) {
    if (!Number.isFinite(value) || value <= 0) {
      return undefined;
    }
    const logErr = error / (value * Math.LN10);
    return Number.isFinite(logErr) ? Math.abs(logErr) : undefined;
  }
  return error;
}

function signalInverseError(signal: number, signalErr: number): number | undefined {
  if (!Number.isFinite(signal) || !Number.isFinite(signalErr) || signal <= 0) {
    return undefined;
  }
  const err = signalErr / (signal * signal);
  return Number.isFinite(err) ? err : undefined;
}

function ingestionResultChannelError(
  result: StxmIngestionResult,
  channel: StxmIngestionPlotChannel,
  index: number,
): number | undefined {
  switch (channel) {
    case "signal_i0": {
      const err = result.i0Err[index];
      return Number.isFinite(err) ? err : undefined;
    }
    case "signal_sample": {
      const err = result.iSampleErr[index];
      return Number.isFinite(err) ? err : undefined;
    }
    case "signal_inv_i0": {
      const signal = result.i0[index] ?? Number.NaN;
      const err = result.i0Err[index] ?? Number.NaN;
      return signalInverseError(signal, err);
    }
    case "od": {
      const err = result.odErr[index];
      return Number.isFinite(err) ? err : undefined;
    }
    case "mass_absorption":
    case "bare_atom": {
      const err = result.massAbsorptionErr?.[index];
      return err != null && Number.isFinite(err) ? err : undefined;
    }
    case "beta":
    case "chi": {
      const err = result.betaErr?.[index];
      return err != null && Number.isFinite(err) ? err : undefined;
    }
    default:
      return undefined;
  }
}

function regionSpectrumChannelError(
  series: StxmRegionSpectrumSeries,
  channel: StxmIngestionPlotChannel,
  index: number,
): number | undefined {
  if (channel === "signal_i0" || channel === "signal_sample" || channel === "signal_inv_i0") {
    const signal = series.signal[index] ?? Number.NaN;
    const err = series.signalErr[index] ?? Number.NaN;
    if (channel === "signal_inv_i0") {
      return signalInverseError(signal, err);
    }
    return Number.isFinite(err) ? err : undefined;
  }
  if (channel === "od") {
    const err = series.odErr?.[index];
    return err != null && Number.isFinite(err) ? err : undefined;
  }
  if (channel === "mass_absorption" || channel === "bare_atom") {
    const err = series.massAbsorptionErr?.[index];
    return err != null && Number.isFinite(err) ? err : undefined;
  }
  if (channel === "beta" || channel === "chi") {
    const err = series.betaErr?.[index];
    return err != null && Number.isFinite(err) ? err : undefined;
  }
  return undefined;
}

function seriesToPoints(
  energyEv: number[],
  channel: StxmIngestionPlotChannel,
  i0PlotScale: StxmI0PlotScaleMode,
  readValue: (index: number) => number,
  readError?: (index: number) => number | undefined,
): SpectrumPoint[] {
  return energyEv.map((energy, index) => {
    const rawValue = readValue(index);
    const absorption = transformY(rawValue, channel, i0PlotScale);
    const rawError = readError?.(index);
    const rawabsError =
      rawError !== undefined
        ? transformErrorY(rawError, rawValue, channel, i0PlotScale)
        : undefined;
    return {
      energy,
      absorption,
      ...(rawabsError !== undefined ? { rawabsError } : {}),
    };
  });
}

function pointsFromResult(
  result: StxmIngestionResult,
  channel: StxmIngestionPlotChannel,
  i0PlotScale: StxmI0PlotScaleMode,
): SpectrumPoint[] {
  return seriesToPoints(
    result.energyEv,
    channel,
    i0PlotScale,
    (index) => ingestionResultChannelValue(result, channel, index),
    (index) => ingestionResultChannelError(result, channel, index),
  );
}

function pointsFromRegionSeries(
  series: StxmRegionSpectrumSeries,
  channel: StxmIngestionPlotChannel,
  i0PlotScale: StxmI0PlotScaleMode,
): SpectrumPoint[] {
  return seriesToPoints(
    series.energyEv,
    channel,
    i0PlotScale,
    (index) => regionSpectrumChannelValue(series, channel, index),
    (index) => regionSpectrumChannelError(series, channel, index),
  );
}

function resolvePrimaryRegionSeries(
  regionSpectra: StxmRegionSpectrumSeries[],
  channel: StxmIngestionPlotChannel,
): StxmRegionSpectrumSeries | null {
  if (regionSpectra.length === 0) {
    return null;
  }
  if (channel === "signal_i0") {
    return regionSpectra.find((series) => series.isIzero) ?? regionSpectra[0] ?? null;
  }
  if (channel === "signal_sample" || channel === "signal_inv_i0") {
    return (
      regionSpectra.find((series) => !series.isIzero) ?? regionSpectra[0] ?? null
    );
  }
  return regionSpectra.find((series) => !series.isIzero) ?? regionSpectra[0] ?? null;
}

function buildCompanionSpectra(
  regionSpectra: StxmRegionSpectrumSeries[],
  channel: StxmIngestionPlotChannel,
  i0PlotScale: StxmI0PlotScaleMode,
  showRegionOverlays: boolean,
  primaryRegionId: string | null,
): DifferenceSpectrum[] {
  if (!showRegionOverlays) {
    return [];
  }
  return regionSpectra
    .filter((series) => {
      if (series.regionId === primaryRegionId) {
        return false;
      }
      if (ingestionChannelUsesRawSignal(channel)) {
        return !series.isIzero || channel === "signal_i0";
      }
      return true;
    })
    .map((series, index) => ({
      label: series.spotLabel,
      preferred: index === 0,
      points: pointsFromRegionSeries(series, channel, i0PlotScale).filter((point) =>
        Number.isFinite(point.absorption),
      ),
    }))
    .filter((spectrum) => spectrum.points.length > 0);
}

function buildReferenceCurves(
  channel: StxmIngestionPlotChannel,
  standards: StxmSpectrumStandardOverlay[],
  bareAtomCurve: ReferenceCurve | null,
  showBareAtomOverlay: boolean,
): ReferenceCurve[] {
  const curves: ReferenceCurve[] = [];
  if (
    bareAtomCurve &&
    showBareAtomOverlay &&
    stxmBareAtomOverlaySupportedForChannel(channel)
  ) {
    curves.push({ ...bareAtomCurve, showInLegend: true });
  }
  for (const standard of standards) {
    if (!standard.enabled) {
      continue;
    }
    curves.push({
      label: standard.label,
      color: standard.color,
      lineDash: "dash",
      points: standard.energyEv.map((energy, index) => ({
        energy,
        absorption: standard.values[index] ?? 0,
      })),
    });
  }
  return curves;
}

function resolvePrimaryTraceLabel(
  channel: StxmIngestionPlotChannel,
  primaryTraceLabel: string | undefined,
  pureRegionLabel: string | undefined,
): string | undefined {
  if (primaryTraceLabel?.trim()) {
    return primaryTraceLabel.trim();
  }
  if (pureRegionLabel?.trim()) {
    const channelLabel = channelDefinitionById(
      STXM_INGESTION_PLOT_DATA_RAIL_DEFINITION,
      channel,
    ).label;
    return `${channelLabel} (${pureRegionLabel.trim()})`;
  }
  return undefined;
}

/**
 * Maps STXM ingestion state into the `SpectrumPlot` point, companion, and reference inputs.
 */
export function buildStxmSpectrumPlotModel(
  params: BuildStxmSpectrumPlotModelParams,
): StxmSpectrumPlotModel | null {
  const {
    result,
    regionSpectra,
    channel,
    i0PlotScale,
    standards,
    bareAtomCurve,
    showBareAtomOverlay,
    showRegionOverlays,
    primaryTraceLabel,
    pureRegionLabel,
  } = params;

  const yAxisQuantity = channelDefinitionById(
    STXM_INGESTION_PLOT_DATA_RAIL_DEFINITION,
    channel,
  ).yAxisQuantity;

  let points: SpectrumPoint[] = [];
  let primaryRegionId: string | null = null;

  if (result && result.energyEv.length > 0) {
    points = pointsFromResult(result, channel, i0PlotScale);
  } else {
    const primarySeries = resolvePrimaryRegionSeries(regionSpectra, channel);
    if (primarySeries) {
      primaryRegionId = primarySeries.regionId;
      points = pointsFromRegionSeries(primarySeries, channel, i0PlotScale);
    }
  }

  if (result && ingestionChannelUsesRawSignal(channel)) {
    const primarySeries = resolvePrimaryRegionSeries(regionSpectra, channel);
    primaryRegionId = primarySeries?.regionId ?? null;
  }

  points = points.filter((point) => Number.isFinite(point.absorption));
  if (points.length === 0) {
    return null;
  }

  const companionSpectra = buildCompanionSpectra(
    regionSpectra,
    channel,
    i0PlotScale,
    showRegionOverlays,
    primaryRegionId,
  );

  const showNormalizationShading =
    result != null &&
    (channel === "od" || channel === "od_normalized");

  const normalizationRegions =
    showNormalizationShading && result
      ? {
          pre: [result.normalization.preLo, result.normalization.preHi] as [
            number,
            number,
          ],
          post: [result.normalization.postLo, result.normalization.postHi] as [
            number,
            number,
          ],
        }
      : undefined;

  return {
    points,
    companionSpectra,
    referenceCurves: buildReferenceCurves(
      channel,
      standards,
      bareAtomCurve,
      showBareAtomOverlay,
    ),
    yAxisQuantity,
    primaryTraceLabel: resolvePrimaryTraceLabel(
      channel,
      primaryTraceLabel,
      pureRegionLabel,
    ),
    normalizationRegions,
    showNormalizationShading,
  };
}
