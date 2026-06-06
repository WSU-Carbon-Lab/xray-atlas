import type {
  DifferenceSpectrum,
  NormalizationRegions,
  ReferenceCurve,
  SpectrumPoint,
  SpectrumYAxisQuantity,
} from "~/components/plots/types";
import type { StxmIngestionResult } from "~/features/dashboard/lib/computeStxmIngestion";
import type { DashboardIngestionResult } from "~/lib/dashboard-processing-session";
import { channelDefinitionById } from "~/components/plots/data-rail";
import {
  ingestionChannelUsesRawIntensity,
  ingestionResultChannelValue,
  regionSpectrumChannelValue,
  transformStxmRawIntensityErrorY,
  transformStxmRawIntensityY,
  type StxmIngestionPlotChannel,
} from "~/lib/stxm/stxm-ingestion-display";
import { stxmBareAtomOverlaySupportedForChannel } from "~/features/dashboard/lib/stxm-bare-atom-overlay";
import { STXM_INGESTION_PLOT_DATA_RAIL_DEFINITION } from "~/lib/stxm/stxm-ingestion-plot-data-rail-config";
import { resolveStxmLinkedCompanionChannel } from "~/lib/stxm/stxm-optical-link";
import type { StxmRawSignalTransformMode } from "~/lib/stxm/stxm-raw-signal-transform";
import type { StxmRegionSpectrumSeries } from "~/lib/stxm/stxm-region-types";

export type StxmCompareOverlay = {
  id: string;
  label: string;
  ingestion: DashboardIngestionResult;
  color: string;
};

function persistedIngestionToRuntime(
  persisted: DashboardIngestionResult,
): StxmIngestionResult {
  return {
    energyEv: persisted.energyEv,
    i0: persisted.i0 ?? [],
    i0Err: [],
    iSample: persisted.iSample ?? [],
    iSampleErr: [],
    iTe: null,
    iTeErr: null,
    od: persisted.od,
    odErr: persisted.odErr,
    odNormalized: persisted.odNormalized ?? persisted.od,
    massAbsorption: persisted.massAbsorption ?? null,
    massAbsorptionErr: null,
    beta: persisted.beta ?? null,
    betaErr: null,
    delta: persisted.delta ?? null,
    normalization: persisted.normalization,
    normalizationScale: persisted.normalizationScale ?? 1,
    bareAtomScale: null,
    bareAtomOffset: null,
    thicknessCm: persisted.thicknessCm ?? 1e-4,
    formula: persisted.formula ?? null,
    weightingMode: persisted.weightingMode,
    kkEngineLabel: persisted.kkEngineLabel ?? null,
  };
}

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
  traceStackPanels?: StxmTraceStackPanel[];
  /** When true, the plot uses region-named traces instead of θ/φ geometry legend chrome. */
  regionScopedTraces?: boolean;
};

export type StxmTraceStackPanel = {
  label: string;
  points: SpectrumPoint[];
  yAxisQuantity: SpectrumYAxisQuantity;
};

export type BuildStxmSpectrumPlotModelParams = {
  result: StxmIngestionResult | null;
  regionSpectra: StxmRegionSpectrumSeries[];
  channel: StxmIngestionPlotChannel;
  /** When set with length > 1, plots each channel as primary plus companions (spectroscopy multi-select). */
  channels?: readonly StxmIngestionPlotChannel[];
  rawSignalTransform: StxmRawSignalTransformMode;
  standards: StxmSpectrumStandardOverlay[];
  bareAtomCurve: ReferenceCurve | null;
  showBareAtomOverlay: boolean;
  showRegionOverlays: boolean;
  linkImaginaryReal?: boolean;
  compareOverlays?: StxmCompareOverlay[];
  normalizationOverride?: NormalizationRegions | null;
  primaryTraceLabel?: string;
  pureRegionLabel?: string;
};

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
    case "signal_it": {
      const err = result.iSampleErr[index];
      return Number.isFinite(err) ? err : undefined;
    }
    case "signal_ie": {
      const err = result.iTeErr?.[index];
      return err != null && Number.isFinite(err) ? err : undefined;
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
  if (channel === "beta" || channel === "chi") {
    const err = series.betaErr?.[index];
    return err != null && Number.isFinite(err) ? err : undefined;
  }
  return undefined;
}

function seriesToPoints(
  energyEv: number[],
  channel: StxmIngestionPlotChannel,
  rawSignalTransform: StxmRawSignalTransformMode,
  readValue: (index: number) => number,
  readError?: (index: number) => number | undefined,
): SpectrumPoint[] {
  return energyEv.map((energy, index) => {
    const rawValue = readValue(index);
    const absorption = transformStxmRawIntensityY(
      rawValue,
      channel,
      rawSignalTransform,
    );
    const rawError = readError?.(index);
    const rawabsError =
      rawError !== undefined
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

function pointsFromResult(
  result: StxmIngestionResult,
  channel: StxmIngestionPlotChannel,
  rawSignalTransform: StxmRawSignalTransformMode,
): SpectrumPoint[] {
  return seriesToPoints(
    result.energyEv,
    channel,
    rawSignalTransform,
    (index) => ingestionResultChannelValue(result, channel, index),
    (index) => ingestionResultChannelError(result, channel, index),
  );
}

function pointsFromRegionSeries(
  series: StxmRegionSpectrumSeries,
  channel: StxmIngestionPlotChannel,
  rawSignalTransform: StxmRawSignalTransformMode,
): SpectrumPoint[] {
  return seriesToPoints(
    series.energyEv,
    channel,
    rawSignalTransform,
    (index) => regionSpectrumChannelValue(series, channel, index),
    (index) => regionSpectrumChannelError(series, channel, index),
  );
}

function izeroRegionSeries(
  regionSpectra: StxmRegionSpectrumSeries[],
): StxmRegionSpectrumSeries | null {
  return regionSpectra.find((series) => series.isIzero) ?? null;
}

function sampleRegionSeriesList(
  regionSpectra: StxmRegionSpectrumSeries[],
): StxmRegionSpectrumSeries[] {
  return regionSpectra.filter((series) => !series.isIzero);
}

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
  const regionLabel = spotLabel.trim() || "region";
  return `${channelLabel} (${regionLabel})`;
}

function regionSeriesHasReducedChannel(
  series: StxmRegionSpectrumSeries,
  channel: StxmIngestionPlotChannel,
): boolean {
  if (channel === "od") {
    return series.od != null && series.od.length > 0;
  }
  if (channel === "od_normalized") {
    return series.odNormalized != null && series.odNormalized.length > 0;
  }
  if (channel === "mass_absorption" || channel === "bare_atom") {
    return series.massAbsorption != null && series.massAbsorption.length > 0;
  }
  if (channel === "beta" || channel === "chi") {
    return series.beta != null && series.beta.length > 0;
  }
  if (channel === "delta" || channel === "f1") {
    return series.delta != null && series.delta.length > 0;
  }
  return false;
}

/**
 * Returns true when per-region spectra should drive plot traces instead of aggregated ingestion result.
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
  if (ingestionChannelUsesRawIntensity(channel) || channel === "od") {
    return sampleRegionSeriesList(regionSpectra).length > 0;
  }
  return sampleRegionSeriesList(regionSpectra).some((series) =>
    regionSeriesHasReducedChannel(series, channel),
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
    return izeroRegionSeries(regionSpectra) ?? regionSpectra[0] ?? null;
  }
  return sampleRegionSeriesList(regionSpectra)[0] ?? null;
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

function computeOdPointsFromRegionRaw(
  izero: StxmRegionSpectrumSeries,
  sample: StxmRegionSpectrumSeries,
  rawSignalTransform: StxmRawSignalTransformMode,
): SpectrumPoint[] {
  const eps = 1e-10;
  return izero.energyEv.map((energy, index) => {
    const i0 = Math.max(izero.signal[index] ?? eps, eps);
    const iSample = Math.max(sample.signal[index] ?? eps, eps);
    const od = Math.log(i0 / iSample);
    const sigmaI0 = izero.signalErr[index] ?? 0;
    const sigmaI = sample.signalErr[index] ?? 0;
    const sigmaOd = Math.sqrt((sigmaI0 / i0) ** 2 + (sigmaI / iSample) ** 2);
    const absorption = transformStxmRawIntensityY(od, "od", rawSignalTransform);
    const rawabsError = transformStxmRawIntensityErrorY(
      sigmaOd,
      od,
      "od",
      rawSignalTransform,
    );
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
): SpectrumPoint[] {
  if (channel === "od" && izero != null && !series.isIzero) {
    return computeOdPointsFromRegionRaw(izero, series, rawSignalTransform).filter(
      (point) => Number.isFinite(point.absorption),
    );
  }
  return pointsFromRegionSeries(series, channel, rawSignalTransform);
}

function buildLinkedOpticalCompanion(
  result: StxmIngestionResult | null,
  regionSpectra: StxmRegionSpectrumSeries[],
  channel: StxmIngestionPlotChannel,
  rawSignalTransform: StxmRawSignalTransformMode,
  linkImaginaryReal: boolean,
): DifferenceSpectrum | null {
  if (!linkImaginaryReal) {
    return null;
  }
  const companionChannel = resolveStxmLinkedCompanionChannel(channel, true);
  if (!companionChannel) {
    return null;
  }
  const companionLabel = channelDefinitionById(
    STXM_INGESTION_PLOT_DATA_RAIL_DEFINITION,
    companionChannel,
  ).label;
  let points: SpectrumPoint[] = [];
  if (result && result.energyEv.length > 0) {
    points = pointsFromResult(result, companionChannel, rawSignalTransform);
  } else {
    const series = resolvePrimaryRegionSeries(regionSpectra, companionChannel);
    if (series) {
      points = pointsFromRegionSeries(series, companionChannel, rawSignalTransform);
    }
  }
  points = points.filter((point) => Number.isFinite(point.absorption));
  if (points.length === 0) {
    return null;
  }
  return {
    label: `${companionLabel} (linked)`,
    preferred: false,
    points,
  };
}

function buildCompareCompanionSpectra(
  compareOverlays: StxmCompareOverlay[],
  channel: StxmIngestionPlotChannel,
  rawSignalTransform: StxmRawSignalTransformMode,
): DifferenceSpectrum[] {
  if (compareOverlays.length === 0) {
    return [];
  }
  return compareOverlays
    .map((overlay) => {
      const runtime = persistedIngestionToRuntime(overlay.ingestion);
      const points = pointsFromResult(runtime, channel, rawSignalTransform).filter(
        (point) => Number.isFinite(point.absorption),
      );
      return {
        label: overlay.label,
        preferred: false,
        points,
      };
    })
    .filter((spectrum) => spectrum.points.length > 0);
}

function buildRegionScopedChannelTraces(
  regionSpectra: StxmRegionSpectrumSeries[],
  channel: StxmIngestionPlotChannel,
  rawSignalTransform: StxmRawSignalTransformMode,
): {
  points: SpectrumPoint[];
  primaryTraceLabel: string;
  companionSpectra: DifferenceSpectrum[];
  primaryRegionId: string | null;
} | null {
  const regions = regionsForChannelTraces(regionSpectra, channel);
  if (regions.length === 0) {
    return null;
  }
  const izero = izeroRegionSeries(regionSpectra);
  const traceEntries = regions
    .map((series) => {
      const points = pointsFromRegionSeriesForChannel(
        series,
        channel,
        rawSignalTransform,
        izero,
      ).filter((point) => Number.isFinite(point.absorption));
      if (points.length === 0) {
        return null;
      }
      return {
        regionId: series.regionId,
        label: buildStxmRegionTraceLabel(channel, series.spotLabel),
        points,
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
    primaryRegionId: primary.regionId,
    companionSpectra: rest.map((entry, index) => ({
      label: entry.label,
      preferred: index === 0,
      points: entry.points,
    })),
  };
}

function buildLegacyRegionCompanionSpectra(
  regionSpectra: StxmRegionSpectrumSeries[],
  channel: StxmIngestionPlotChannel,
  rawSignalTransform: StxmRawSignalTransformMode,
  showRegionOverlays: boolean,
  primaryRegionId: string | null,
): DifferenceSpectrum[] {
  if (!showRegionOverlays) {
    return [];
  }
  return regionSpectra
    .filter((series) => series.regionId !== primaryRegionId)
    .map((series, index) => ({
      label: buildStxmRegionTraceLabel(channel, series.spotLabel),
      preferred: index === 0,
      points: pointsFromRegionSeriesForChannel(
        series,
        channel,
        rawSignalTransform,
        izeroRegionSeries(regionSpectra),
      ).filter((point) => Number.isFinite(point.absorption)),
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

type ChannelPointsResult = {
  points: SpectrumPoint[];
  primaryRegionId: string | null;
  primaryTraceLabel?: string;
  regionCompanionSpectra?: DifferenceSpectrum[];
  regionScoped: boolean;
};

function buildChannelPoints(
  result: StxmIngestionResult | null,
  regionSpectra: StxmRegionSpectrumSeries[],
  channel: StxmIngestionPlotChannel,
  rawSignalTransform: StxmRawSignalTransformMode,
): ChannelPointsResult {
  if (shouldUseStxmRegionScopedTraces(regionSpectra, channel)) {
    const scoped = buildRegionScopedChannelTraces(
      regionSpectra,
      channel,
      rawSignalTransform,
    );
    if (scoped) {
      return {
        points: scoped.points,
        primaryRegionId: scoped.primaryRegionId,
        primaryTraceLabel: scoped.primaryTraceLabel,
        regionCompanionSpectra: scoped.companionSpectra,
        regionScoped: true,
      };
    }
  }

  let points: SpectrumPoint[] = [];
  let primaryRegionId: string | null = null;

  if (result && result.energyEv.length > 0) {
    points = pointsFromResult(result, channel, rawSignalTransform);
  } else {
    const primarySeries = resolvePrimaryRegionSeries(regionSpectra, channel);
    if (primarySeries) {
      primaryRegionId = primarySeries.regionId;
      points = pointsFromRegionSeriesForChannel(
        primarySeries,
        channel,
        rawSignalTransform,
        izeroRegionSeries(regionSpectra),
      );
    }
  }

  if (result && ingestionChannelUsesRawIntensity(channel)) {
    const primarySeries = resolvePrimaryRegionSeries(regionSpectra, channel);
    primaryRegionId = primarySeries?.regionId ?? null;
  }

  points = points.filter((point) => Number.isFinite(point.absorption));
  return { points, primaryRegionId, regionScoped: false };
}

function buildSingleChannelPlotModel(
  params: BuildStxmSpectrumPlotModelParams,
  channel: StxmIngestionPlotChannel,
): Omit<StxmSpectrumPlotModel, "traceStackPanels"> | null {
  const {
    result,
    regionSpectra,
    rawSignalTransform,
    standards,
    bareAtomCurve,
    showBareAtomOverlay,
    showRegionOverlays,
    linkImaginaryReal = false,
    compareOverlays = [],
    normalizationOverride,
    primaryTraceLabel,
    pureRegionLabel,
  } = params;

  const yAxisQuantity = channelDefinitionById(
    STXM_INGESTION_PLOT_DATA_RAIL_DEFINITION,
    channel,
  ).yAxisQuantity;

  const channelPoints = buildChannelPoints(
    result,
    regionSpectra,
    channel,
    rawSignalTransform,
  );
  const { points, primaryRegionId, regionScoped } = channelPoints;

  if (points.length === 0) {
    return null;
  }

  const regionCompanions = regionScoped
    ? (channelPoints.regionCompanionSpectra ?? [])
    : buildLegacyRegionCompanionSpectra(
        regionSpectra,
        channel,
        rawSignalTransform,
        showRegionOverlays,
        primaryRegionId,
      );
  const linkedCompanion = buildLinkedOpticalCompanion(
    result,
    regionSpectra,
    channel,
    rawSignalTransform,
    linkImaginaryReal,
  );
  const compareCompanions = buildCompareCompanionSpectra(
    compareOverlays,
    channel,
    rawSignalTransform,
  );
  const companionSpectra = [
    ...regionCompanions,
    ...(linkedCompanion ? [linkedCompanion] : []),
    ...compareCompanions,
  ];

  const showNormalizationShading =
    result != null &&
    (channel === "od" ||
      channel === "od_normalized" ||
      channel === "mass_absorption");

  const normalizationRegions =
    normalizationOverride ??
    (showNormalizationShading && result
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
      : undefined);

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
    primaryTraceLabel: regionScoped
      ? channelPoints.primaryTraceLabel
      : resolvePrimaryTraceLabel(channel, primaryTraceLabel, pureRegionLabel),
    normalizationRegions,
    showNormalizationShading,
    regionScopedTraces: regionScoped,
  };
}

/**
 * Maps STXM ingestion state into the `SpectrumPlot` point, companion, and reference inputs.
 */
export function buildStxmSpectrumPlotModel(
  params: BuildStxmSpectrumPlotModelParams,
): StxmSpectrumPlotModel | null {
  const plotChannels =
    params.channels != null && params.channels.length > 1
      ? params.channels
      : [params.channel];

  if (plotChannels.length === 1) {
    return buildSingleChannelPlotModel(params, plotChannels[0]!);
  }

  const channelModels = plotChannels
    .map((ch) => buildSingleChannelPlotModel(params, ch))
    .filter((model): model is NonNullable<typeof model> => model != null);

  if (channelModels.length === 0) {
    return null;
  }

  const primary = channelModels[0];
  if (primary == null) {
    return null;
  }
  const rest = channelModels.slice(1);
  const companionSpectra: DifferenceSpectrum[] = [
    ...rest.map((model, index) => {
      const ch = plotChannels[index + 1]!;
      const label = channelDefinitionById(
        STXM_INGESTION_PLOT_DATA_RAIL_DEFINITION,
        ch,
      ).label;
      return {
        label,
        preferred: index === 0,
        points: model.points,
      };
    }),
    ...primary.companionSpectra,
  ];

  const traceStackPanels: StxmTraceStackPanel[] = channelModels.map(
    (model, index) => {
      const ch = plotChannels[index]!;
      return {
        label: channelDefinitionById(
          STXM_INGESTION_PLOT_DATA_RAIL_DEFINITION,
          ch,
        ).label,
        points: model.points,
        yAxisQuantity: model.yAxisQuantity,
      };
    },
  );

  return {
    ...primary,
    companionSpectra,
    primaryTraceLabel: undefined,
    showNormalizationShading: false,
    normalizationRegions: undefined,
    referenceCurves: [],
    traceStackPanels,
  };
}
