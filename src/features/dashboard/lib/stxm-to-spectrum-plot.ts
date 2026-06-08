import type {
  DifferenceSpectrum,
  NormalizationRegions,
  ReferenceCurve,
  SpectrumPoint,
  SpectrumYAxisQuantity,
} from "~/components/plots/types";
import {
  type StxmIngestionResult,
} from "~/features/dashboard/lib/computeStxmIngestion";
import type { DashboardIngestionResult } from "~/lib/dashboard-processing-session";
import { channelDefinitionById } from "~/components/plots/data-rail";
import {
  deriveStxmOpticalChannelSeries,
  ingestionChannelUsesRawIntensity,
  ingestionResultChannelValue,
  isStxmDerivedOpticalPlotChannel,
  transformStxmRawIntensityErrorY,
  transformStxmRawIntensityY,
  type StxmIngestionPlotChannel,
} from "~/lib/stxm/stxm-ingestion-display";
import { stxmBareAtomOverlaySupportedForChannel } from "~/features/dashboard/lib/stxm-bare-atom-overlay";
import { STXM_INGESTION_PLOT_DATA_RAIL_DEFINITION } from "~/lib/stxm/stxm-ingestion-plot-data-rail-config";
import { resolveStxmLinkedCompanionChannel } from "~/lib/stxm/stxm-optical-link";
import type { StxmRawSignalTransformMode } from "~/lib/stxm/stxm-raw-signal-transform";
import type { StxmRegionSpectrumSeries } from "~/lib/stxm/stxm-region-types";
import {
  buildStxmEnergyValidityMask,
  isStxmRawSampleValid,
  maskStxmDisplaySample,
  stxmSpectrumPointsHaveFiniteAbsorption,
} from "~/lib/stxm/sanitize-stxm-signal-points";
import {
  buildLegacyRegionCompanionSpectra,
  buildRegionScopedChannelTraces,
  hasStxmMultiRegionLineScanData,
  izeroRegionSeries,
  pointsFromRegionSeriesForChannel,
  regionSeriesValidityMask,
  resolvePrimaryRegionSeries,
  sampleRegionSeriesList,
  shouldUseStxmRegionScopedTraces,
} from "~/features/dashboard/lib/stxm-region-traces";

export {
  buildStxmRegionLegendSpotLabel,
  buildStxmRegionTraceLabel,
  buildStxmRegionTraceLegendId,
  shouldUseStxmRegionScopedTraces,
} from "~/features/dashboard/lib/stxm-region-traces";

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
  /** Stroke color for the primary region trace when {@link regionScopedTraces} is true. */
  primaryTraceColor?: string;
  /** Stable visibility id for the primary region trace when {@link regionScopedTraces} is true. */
  primaryTraceLegendId?: string;
  /** Region spot label for the primary trace row when {@link regionScopedTraces} is true. */
  primaryRegionSpotLabel?: string;
  /** Short channel header glyph for region-scoped legend mode. */
  channelLegendGlyph?: string;
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
    case "beta": {
      const err = result.betaErr?.[index];
      return err != null && Number.isFinite(err) ? err : undefined;
    }
    case "f2":
    case "im-epsilon":
    case "im-chi":
    case "f1":
    case "re-epsilon":
    case "re-chi":
      return undefined;
    default:
      return undefined;
  }
}

function ingestionValidityMask(result: StxmIngestionResult): boolean[] {
  return buildStxmEnergyValidityMask(
    result.i0,
    result.iSample,
    result.iTe ?? undefined,
  );
}

function ingestionValidityAtIndex(
  result: StxmIngestionResult,
  channel: StxmIngestionPlotChannel,
  index: number,
  validityMask: readonly boolean[],
): boolean {
  const isEnergyValid = validityMask[index] ?? false;
  if (!isEnergyValid) {
    return false;
  }
  const i0 = result.i0[index] ?? Number.NaN;
  const it = result.iSample[index] ?? Number.NaN;
  const ie = result.iTe?.[index];
  switch (channel) {
    case "signal_i0":
      return isStxmRawSampleValid(i0);
    case "signal_it":
      return isStxmRawSampleValid(i0, it);
    case "signal_ie":
      return isStxmRawSampleValid(i0, it, ie);
    default:
      return isStxmRawSampleValid(i0, it);
  }
}

function seriesToPoints(
  energyEv: number[],
  channel: StxmIngestionPlotChannel,
  rawSignalTransform: StxmRawSignalTransformMode,
  readValue: (index: number) => number,
  readError?: (index: number) => number | undefined,
  isValidAtIndex?: (index: number) => boolean,
): SpectrumPoint[] {
  const points = energyEv.map((energy, index) => {
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
  return points;
}

function pointsFromResult(
  result: StxmIngestionResult,
  channel: StxmIngestionPlotChannel,
  rawSignalTransform: StxmRawSignalTransformMode,
): SpectrumPoint[] {
  const validityMask = ingestionValidityMask(result);
  if (isStxmDerivedOpticalPlotChannel(channel)) {
    const derived = deriveStxmOpticalChannelSeries(
      channel,
      result.energyEv,
      result.beta,
      result.delta,
      result.formula,
    );
    if (!derived) {
      return [];
    }
    return seriesToPoints(
      result.energyEv,
      channel,
      rawSignalTransform,
      (index) => derived[index] ?? Number.NaN,
      undefined,
      (index) => ingestionValidityAtIndex(result, channel, index, validityMask),
    );
  }
  return seriesToPoints(
    result.energyEv,
    channel,
    rawSignalTransform,
    (index) => ingestionResultChannelValue(result, channel, index),
    (index) => ingestionResultChannelError(result, channel, index),
    (index) => ingestionValidityAtIndex(result, channel, index, validityMask),
  );
}

function plotFormulaFromResult(
  result: StxmIngestionResult | null,
): string | null {
  const trimmed = result?.formula?.trim();
  return trimmed?.length ? trimmed : null;
}

function buildLinkedOpticalCompanion(
  result: StxmIngestionResult | null,
  regionSpectra: StxmRegionSpectrumSeries[],
  channel: StxmIngestionPlotChannel,
  rawSignalTransform: StxmRawSignalTransformMode,
  linkImaginaryReal: boolean,
  formula: string | null,
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
      const validityMask = regionSeriesValidityMask(regionSpectra, series);
      points = pointsFromRegionSeriesForChannel(
        series,
        companionChannel,
        rawSignalTransform,
        izeroRegionSeries(regionSpectra),
        formula,
        validityMask,
      );
    }
  }
  if (!stxmSpectrumPointsHaveFiniteAbsorption(points)) {
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
      const points = pointsFromResult(runtime, channel, rawSignalTransform);
      return {
        label: overlay.label,
        preferred: false,
        points,
      };
    })
    .filter((spectrum) => stxmSpectrumPointsHaveFiniteAbsorption(spectrum.points));
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
  primaryTraceColor?: string;
  primaryTraceLegendId?: string;
  primaryRegionSpotLabel?: string;
  regionCompanionSpectra?: DifferenceSpectrum[];
  regionScoped: boolean;
};

function buildChannelPoints(
  result: StxmIngestionResult | null,
  regionSpectra: StxmRegionSpectrumSeries[],
  channel: StxmIngestionPlotChannel,
  rawSignalTransform: StxmRawSignalTransformMode,
): ChannelPointsResult {
  const formula = plotFormulaFromResult(result);
  const multiRegionIngestion = hasStxmMultiRegionLineScanData(regionSpectra);
  if (shouldUseStxmRegionScopedTraces(regionSpectra, channel)) {
    const scoped = buildRegionScopedChannelTraces(
      regionSpectra,
      channel,
      rawSignalTransform,
      formula,
    );
    if (scoped) {
      return {
        points: scoped.points,
        primaryRegionId: scoped.primaryRegionId,
        primaryTraceLabel: scoped.primaryTraceLabel,
        primaryTraceColor: scoped.primaryTraceColor,
        primaryTraceLegendId: scoped.primaryTraceLegendId,
        primaryRegionSpotLabel: scoped.primaryRegionSpotLabel,
        regionCompanionSpectra: scoped.companionSpectra,
        regionScoped: true,
      };
    }
    if (multiRegionIngestion) {
      const primarySeries = sampleRegionSeriesList(regionSpectra)[0] ?? null;
      return {
        points: [],
        primaryRegionId: primarySeries?.regionId ?? null,
        regionScoped: true,
      };
    }
  }

  if (multiRegionIngestion) {
    return {
      points: [],
      primaryRegionId: sampleRegionSeriesList(regionSpectra)[0]?.regionId ?? null,
      regionScoped: true,
    };
  }

  let points: SpectrumPoint[] = [];
  let primaryRegionId: string | null = null;

  if (result && result.energyEv.length > 0) {
    points = pointsFromResult(result, channel, rawSignalTransform);
  } else {
    const primarySeries = resolvePrimaryRegionSeries(regionSpectra, channel);
    if (primarySeries) {
      primaryRegionId = primarySeries.regionId;
      const validityMask = regionSeriesValidityMask(regionSpectra, primarySeries);
      points = pointsFromRegionSeriesForChannel(
        primarySeries,
        channel,
        rawSignalTransform,
        izeroRegionSeries(regionSpectra),
        formula,
        validityMask,
      );
    }
  }

  if (result && ingestionChannelUsesRawIntensity(channel)) {
    const primarySeries = resolvePrimaryRegionSeries(regionSpectra, channel);
    primaryRegionId = primarySeries?.regionId ?? null;
  }

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

  const formula = plotFormulaFromResult(result);

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

  if (!stxmSpectrumPointsHaveFiniteAbsorption(points)) {
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
        formula,
      );
  const linkedCompanion = buildLinkedOpticalCompanion(
    result,
    regionSpectra,
    channel,
    rawSignalTransform,
    linkImaginaryReal,
    formula,
  );
  const compareCompanions = regionScoped
    ? []
    : buildCompareCompanionSpectra(
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
    primaryTraceColor: regionScoped ? channelPoints.primaryTraceColor : undefined,
    primaryTraceLegendId: regionScoped
      ? channelPoints.primaryTraceLegendId
      : undefined,
    primaryRegionSpotLabel: regionScoped
      ? channelPoints.primaryRegionSpotLabel
      : undefined,
    channelLegendGlyph: channelDefinitionById(
      STXM_INGESTION_PLOT_DATA_RAIL_DEFINITION,
      channel,
    ).label,
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
