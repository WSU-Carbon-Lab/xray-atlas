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
};

export type BuildStxmSpectrumPlotModelParams = {
  result: StxmIngestionResult | null;
  regionSpectra: StxmRegionSpectrumSeries[];
  channel: StxmIngestionPlotChannel;
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
  if (channel === "signal_it" || channel === "signal_ie") {
    return (
      regionSpectra.find((series) => !series.isIzero) ?? regionSpectra[0] ?? null
    );
  }
  return regionSpectra.find((series) => !series.isIzero) ?? regionSpectra[0] ?? null;
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

function buildCompanionSpectra(
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
    .filter((series) => {
      if (series.regionId === primaryRegionId) {
        return false;
      }
      if (ingestionChannelUsesRawIntensity(channel)) {
        return !series.isIzero || channel === "signal_i0";
      }
      return true;
    })
    .map((series, index) => ({
      label: series.spotLabel,
      preferred: index === 0,
      points: pointsFromRegionSeries(series, channel, rawSignalTransform).filter(
        (point) => Number.isFinite(point.absorption),
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

  let points: SpectrumPoint[] = [];
  let primaryRegionId: string | null = null;

  if (result && result.energyEv.length > 0) {
    points = pointsFromResult(result, channel, rawSignalTransform);
  } else {
    const primarySeries = resolvePrimaryRegionSeries(regionSpectra, channel);
    if (primarySeries) {
      primaryRegionId = primarySeries.regionId;
      points = pointsFromRegionSeries(primarySeries, channel, rawSignalTransform);
    }
  }

  if (result && ingestionChannelUsesRawIntensity(channel)) {
    const primarySeries = resolvePrimaryRegionSeries(regionSpectra, channel);
    primaryRegionId = primarySeries?.regionId ?? null;
  }

  points = points.filter((point) => Number.isFinite(point.absorption));
  if (points.length === 0) {
    return null;
  }

  const regionCompanions = buildCompanionSpectra(
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
    primaryTraceLabel: resolvePrimaryTraceLabel(
      channel,
      primaryTraceLabel,
      pureRegionLabel,
    ),
    normalizationRegions,
    showNormalizationShading,
  };
}
