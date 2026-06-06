import type { DifferenceSpectrum, SpectrumPoint } from "~/components/plots/types";
import { channelDefinitionById } from "~/components/plots/data-rail";
import {
  beerLambertFromSummedSignals,
} from "~/features/dashboard/lib/computeStxmIngestion";
import {
  deriveStxmOpticalChannelSeries,
  ingestionChannelUsesRawIntensity,
  isStxmDerivedOpticalPlotChannel,
  regionSpectrumChannelValue,
  transformStxmRawIntensityErrorY,
  transformStxmRawIntensityY,
  type StxmIngestionPlotChannel,
} from "~/lib/stxm/stxm-ingestion-display";
import { STXM_INGESTION_PLOT_DATA_RAIL_DEFINITION } from "~/lib/stxm/stxm-ingestion-plot-data-rail-config";
import type { StxmRawSignalTransformMode } from "~/lib/stxm/stxm-raw-signal-transform";
import type { StxmRegionSpectrumSeries } from "~/lib/stxm/stxm-region-types";
import {
  buildStxmEnergyValidityMask,
  isStxmEnergyValidAtIndex,
  isStxmRawSampleValid,
  maskStxmDisplaySample,
  stxmSpectrumPointsHaveFiniteAbsorption,
} from "~/lib/stxm/sanitize-stxm-signal-points";

/**
 * Builds the legend label `Channel (region)` for one STXM sample or izero region trace.
 */
export function buildStxmRegionTraceLabel(
  channel: StxmIngestionPlotChannel,
  spotLabel: string,
): string {
  const channelLabel = channelDefinitionById(
    STXM_INGESTION_PLOT_DATA_RAIL_DEFINITION,
    channel,
  ).label;
  const regionLabel = buildStxmRegionLegendSpotLabel(spotLabel);
  return `${channelLabel} (${regionLabel})`;
}

/**
 * Returns the region-only legend label (spot name) for region-scoped plot legend rows.
 */
export function buildStxmRegionLegendSpotLabel(spotLabel: string): string {
  const trimmed = spotLabel.trim();
  return trimmed.length > 0 ? trimmed : "region";
}

/**
 * Builds a stable trace visibility id for one STXM region line in region-scoped plot mode.
 */
export function buildStxmRegionTraceLegendId(regionId: string): string {
  const trimmed = regionId.trim();
  return trimmed.length > 0 ? `stxm-region-${trimmed}` : "stxm-region-unknown";
}

export function izeroRegionSeries(
  regionSpectra: StxmRegionSpectrumSeries[],
): StxmRegionSpectrumSeries | null {
  return regionSpectra.find((series) => series.isIzero) ?? null;
}

export function sampleRegionSeriesList(
  regionSpectra: StxmRegionSpectrumSeries[],
): StxmRegionSpectrumSeries[] {
  return regionSpectra.filter((series) => !series.isIzero);
}

/**
 * Returns true when at least one non-izero sample region exists in per-region spectra.
 */
export function hasStxmMultiRegionLineScanData(
  regionSpectra: StxmRegionSpectrumSeries[],
): boolean {
  return sampleRegionSeriesList(regionSpectra).length > 0;
}

function regionSpectrumChannelError(
  series: StxmRegionSpectrumSeries,
  channel: StxmIngestionPlotChannel,
  index: number,
): number | undefined {
  if (channel === "signal_i0" || channel === "signal_it") {
    const err = series.signalErr[index] ?? Number.NaN;
    return Number.isFinite(err) ? err : undefined;
  }
  if (channel === "signal_ie") {
    const err = series.teyDrainErr?.[index];
    return err != null && Number.isFinite(err) ? err : undefined;
  }
  if (channel === "od") {
    const err = series.odErr?.[index];
    return err != null && Number.isFinite(err) ? err : undefined;
  }
  if (channel === "mass_absorption" || channel === "bare_atom") {
    const err = series.massAbsorptionErr?.[index];
    return err != null && Number.isFinite(err) ? err : undefined;
  }
  if (channel === "beta") {
    const err = series.betaErr?.[index];
    return err != null && Number.isFinite(err) ? err : undefined;
  }
  if (isStxmDerivedOpticalPlotChannel(channel) || channel === "delta") {
    return undefined;
  }
  return undefined;
}

function regionValidityMask(
  izero: StxmRegionSpectrumSeries | null,
  sample: StxmRegionSpectrumSeries | null,
  ieSeries?: readonly number[] | null,
): boolean[] {
  if (!izero) {
    return [];
  }
  return buildStxmEnergyValidityMask(
    izero.signal,
    sample?.signal,
    ieSeries ?? undefined,
  );
}

function regionValidityAtIndex(
  series: StxmRegionSpectrumSeries,
  channel: StxmIngestionPlotChannel,
  index: number,
  izero: StxmRegionSpectrumSeries | null,
  validityMask: readonly boolean[],
): boolean {
  const isEnergyValid = validityMask[index] ?? true;
  if (!isEnergyValid) {
    return false;
  }
  if (channel === "signal_i0") {
    return isStxmRawSampleValid(series.signal[index] ?? Number.NaN);
  }
  const i0 = izero?.signal[index] ?? Number.NaN;
  const it = series.isIzero ? undefined : (series.signal[index] ?? Number.NaN);
  if (channel === "signal_it") {
    return isStxmRawSampleValid(i0, it);
  }
  if (channel === "signal_ie") {
    const ie = series.teyDrain?.[index];
    return isStxmRawSampleValid(i0, it, ie);
  }
  if (series.isIzero) {
    return isStxmRawSampleValid(i0);
  }
  return isStxmRawSampleValid(i0, it);
}

function seriesToPoints(
  energyEv: number[],
  channel: StxmIngestionPlotChannel,
  rawSignalTransform: StxmRawSignalTransformMode,
  readValue: (index: number) => number,
  readError?: (index: number) => number | undefined,
  isValidAtIndex?: (index: number) => boolean,
): SpectrumPoint[] {
  return energyEv.map((energy, index) => {
    const isEnergyValid = isValidAtIndex?.(index) ?? true;
    const rawValue = maskStxmDisplaySample(readValue(index), isEnergyValid);
    const absorption = transformStxmRawIntensityY(
      rawValue,
      channel,
      rawSignalTransform,
    );
    const rawError = readError?.(index);
    const rawabsError =
      rawError !== undefined && Number.isFinite(rawValue)
        ? transformStxmRawIntensityErrorY(
            rawError,
            rawValue,
            channel,
            rawSignalTransform,
          )
        : undefined;
    return {
      energy,
      absorption,
      ...(rawabsError !== undefined ? { rawabsError } : {}),
    };
  });
}

function pointsFromRegionSeries(
  series: StxmRegionSpectrumSeries,
  channel: StxmIngestionPlotChannel,
  rawSignalTransform: StxmRawSignalTransformMode,
  formula: string | null | undefined,
  izero: StxmRegionSpectrumSeries | null,
  validityMask: readonly boolean[],
): SpectrumPoint[] {
  const validity = (index: number) =>
    regionValidityAtIndex(series, channel, index, izero, validityMask);
  if (isStxmDerivedOpticalPlotChannel(channel)) {
    const derived = deriveStxmOpticalChannelSeries(
      channel,
      series.energyEv,
      series.beta,
      series.delta,
      formula,
    );
    if (!derived) {
      return [];
    }
    return seriesToPoints(
      series.energyEv,
      channel,
      rawSignalTransform,
      (index) => derived[index] ?? Number.NaN,
      undefined,
      validity,
    );
  }
  return seriesToPoints(
    series.energyEv,
    channel,
    rawSignalTransform,
    (index) => regionSpectrumChannelValue(series, channel, index, formula),
    (index) => regionSpectrumChannelError(series, channel, index),
    validity,
  );
}

function regionSeriesValidityMask(
  regionSpectra: StxmRegionSpectrumSeries[],
  series: StxmRegionSpectrumSeries,
): boolean[] {
  const izero = izeroRegionSeries(regionSpectra);
  const sample = series.isIzero ? null : series;
  return regionValidityMask(izero, sample, series.teyDrain);
}

function computeOdPointsFromRegionRaw(
  izero: StxmRegionSpectrumSeries,
  sample: StxmRegionSpectrumSeries,
  rawSignalTransform: StxmRawSignalTransformMode,
): SpectrumPoint[] {
  const { od, odErr } = beerLambertFromSummedSignals(
    izero.signal,
    izero.signalErr,
    sample.signal,
    sample.signalErr,
  );
  return izero.energyEv.map((energy, index) => {
    const isEnergyValid = isStxmEnergyValidAtIndex(
      index,
      izero.signal,
      sample.signal,
    );
    const odValue = maskStxmDisplaySample(
      od[index] ?? Number.NaN,
      isEnergyValid,
    );
    const sigmaOd = odErr[index] ?? 0;
    const absorption = transformStxmRawIntensityY(
      odValue,
      "od",
      rawSignalTransform,
    );
    const rawabsError = Number.isFinite(odValue)
      ? transformStxmRawIntensityErrorY(sigmaOd, odValue, "od", rawSignalTransform)
      : undefined;
    return {
      energy,
      absorption,
      ...(rawabsError !== undefined ? { rawabsError } : {}),
    };
  });
}

function pointsFromRegionSeriesForChannel(
  series: StxmRegionSpectrumSeries,
  channel: StxmIngestionPlotChannel,
  rawSignalTransform: StxmRawSignalTransformMode,
  izero: StxmRegionSpectrumSeries | null,
  formula: string | null,
  validityMask: readonly boolean[],
): SpectrumPoint[] {
  if (channel === "od" && izero != null && !series.isIzero) {
    return computeOdPointsFromRegionRaw(izero, series, rawSignalTransform);
  }
  return pointsFromRegionSeries(
    series,
    channel,
    rawSignalTransform,
    formula,
    izero,
    validityMask,
  );
}

function regionsForChannelTraces(
  regionSpectra: StxmRegionSpectrumSeries[],
  channel: StxmIngestionPlotChannel,
): StxmRegionSpectrumSeries[] {
  if (channel === "signal_i0") {
    const izero = izeroRegionSeries(regionSpectra);
    return izero ? [izero] : [];
  }
  return sampleRegionSeriesList(regionSpectra);
}

/**
 * Returns true when per-region spectra should drive plot traces instead of aggregated ingestion result.
 *
 * For line-scan ingestion with sample regions, callers must stay in region-scoped mode even while
 * async enrichment (beta, delta, normalized OD) is still running; the plot builder computes OD from
 * raw intensities on demand and waits for enriched arrays instead of falling back to legacy traces.
 */
export function shouldUseStxmRegionScopedTraces(
  regionSpectra: StxmRegionSpectrumSeries[],
  channel: StxmIngestionPlotChannel,
): boolean {
  if (regionSpectra.length === 0) {
    return false;
  }
  if (channel === "signal_i0") {
    return izeroRegionSeries(regionSpectra) != null;
  }
  const sampleRegions = sampleRegionSeriesList(regionSpectra);
  if (sampleRegions.length === 0) {
    return false;
  }
  if (ingestionChannelUsesRawIntensity(channel)) {
    return true;
  }
  if (channel === "od" || channel === "od_normalized") {
    return izeroRegionSeries(regionSpectra) != null;
  }
  return true;
}

export type StxmRegionScopedChannelTraces = {
  points: SpectrumPoint[];
  primaryTraceLabel: string;
  primaryTraceColor?: string;
  primaryTraceLegendId: string;
  primaryRegionSpotLabel: string;
  companionSpectra: DifferenceSpectrum[];
  primaryRegionId: string | null;
};

/**
 * Builds one primary trace plus companion traces for every sample region in region-scoped plot mode.
 */
export function buildRegionScopedChannelTraces(
  regionSpectra: StxmRegionSpectrumSeries[],
  channel: StxmIngestionPlotChannel,
  rawSignalTransform: StxmRawSignalTransformMode,
  formula: string | null,
): StxmRegionScopedChannelTraces | null {
  const regions = regionsForChannelTraces(regionSpectra, channel);
  if (regions.length === 0) {
    return null;
  }
  const izero = izeroRegionSeries(regionSpectra);
  const traceEntries = regions
    .map((series) => {
      const validityMask = regionSeriesValidityMask(regionSpectra, series);
      const points = pointsFromRegionSeriesForChannel(
        series,
        channel,
        rawSignalTransform,
        izero,
        formula,
        validityMask,
      );
      if (!stxmSpectrumPointsHaveFiniteAbsorption(points)) {
        return null;
      }
      return {
        regionId: series.regionId,
        label: buildStxmRegionTraceLabel(channel, series.spotLabel),
        regionSpotLabel: buildStxmRegionLegendSpotLabel(series.spotLabel),
        legendId: buildStxmRegionTraceLegendId(series.regionId),
        points,
        color: series.color,
      };
    })
    .filter((entry): entry is NonNullable<typeof entry> => entry != null);
  if (traceEntries.length === 0) {
    return null;
  }
  const primary = traceEntries[0];
  if (!primary) {
    return null;
  }
  const rest = traceEntries.slice(1);
  return {
    points: primary.points,
    primaryTraceLabel: primary.label,
    primaryTraceColor: primary.color,
    primaryRegionId: primary.regionId,
    primaryTraceLegendId: primary.legendId,
    primaryRegionSpotLabel: primary.regionSpotLabel,
    companionSpectra: rest.map((entry) => ({
      label: entry.label,
      preferred: false,
      color: entry.color,
      legendId: entry.legendId,
      regionSpotLabel: entry.regionSpotLabel,
      points: entry.points,
    })),
  };
}

export function buildLegacyRegionCompanionSpectra(
  regionSpectra: StxmRegionSpectrumSeries[],
  channel: StxmIngestionPlotChannel,
  rawSignalTransform: StxmRawSignalTransformMode,
  showRegionOverlays: boolean,
  primaryRegionId: string | null,
  formula: string | null,
): DifferenceSpectrum[] {
  if (!showRegionOverlays) {
    return [];
  }
  return regionSpectra
    .filter((series) => series.regionId !== primaryRegionId)
    .map((series) => {
      const validityMask = regionSeriesValidityMask(regionSpectra, series);
      return {
        label: buildStxmRegionTraceLabel(channel, series.spotLabel),
        preferred: false,
        color: series.color,
        legendId: buildStxmRegionTraceLegendId(series.regionId),
        regionSpotLabel: buildStxmRegionLegendSpotLabel(series.spotLabel),
        points: pointsFromRegionSeriesForChannel(
          series,
          channel,
          rawSignalTransform,
          izeroRegionSeries(regionSpectra),
          formula,
          validityMask,
        ),
      };
    })
    .filter((spectrum) => stxmSpectrumPointsHaveFiniteAbsorption(spectrum.points));
}

export function resolvePrimaryRegionSeries(
  regionSpectra: StxmRegionSpectrumSeries[],
  channel: StxmIngestionPlotChannel,
): StxmRegionSpectrumSeries | null {
  if (regionSpectra.length === 0) {
    return null;
  }
  if (channel === "signal_i0") {
    return izeroRegionSeries(regionSpectra) ?? regionSpectra[0] ?? null;
  }
  return sampleRegionSeriesList(regionSpectra)[0] ?? null;
}

export {
  pointsFromRegionSeriesForChannel,
  regionSeriesValidityMask,
};
