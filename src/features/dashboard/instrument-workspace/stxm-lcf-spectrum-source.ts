/**
 * Resolves STXM preview and Atlas trace keys into {@link LcfSpectrum} samples for LCF.
 */

import type { SpectrumPoint } from "~/components/plots/types";
import { buildPlotPointsForChannel } from "~/features/process-nexafs/nexafs-plot-channels";
import type { DashboardPlotDatasetInput } from "~/features/dashboard/plot-viewer/build-dashboard-plot-model";
import { filterPointsByGeometryKeys } from "~/features/dashboard/plot-viewer/geometry-keys";
import { parsePlotViewerTraceKey } from "~/features/dashboard/plot-viewer/plot-viewer-trace-key";
import type {
  DashboardIngestionResult,
  DashboardPreviewAtlasEntry,
  DashboardPreviewRegionSpectrum,
  DashboardPreviewSpectrumEntry,
} from "~/lib/dashboard-processing-session";
import type { LcfSpectrum } from "~/lib/stxm/lcf";
import { isAtlasPreviewCompareTraceKey } from "./preview-compare-trace-key";
import {
  listAtlasPreviewTraceCandidates,
  listStxmPreviewTraceCandidates,
  stxmPreviewChannelToNexafsChannelId,
  type StxmPreviewCompareChannel,
} from "./stxm-preview-styled-traces";
import {
  buildStxmPreviewTraceKey,
  parseStxmPreviewTraceKey,
  STXM_PREVIEW_AGGREGATE_REGION_ID,
} from "./stxm-preview-trace-key";
import { buildStxmSpectrumPlotModel } from "~/features/dashboard/lib/stxm-to-spectrum-plot";
import { normalizeNexafsOd } from "~/lib/stxm/normalization";
import {
  izeroRegionSeries,
  pointsFromRegionSeriesForChannel,
} from "~/features/dashboard/lib/stxm-region-traces";
import type { StxmRegionSpectrumSeries } from "~/lib/stxm/stxm-region-types";
import type { DashboardPreviewRegionSpectrum as RegionSpectrum } from "~/lib/dashboard-processing-session";

export type LcfTraceCandidate = {
  traceKey: string;
  label: string;
  source: "beamtime" | "atlas";
};

function persistedIngestionToRuntime(ingestion: DashboardIngestionResult) {
  return {
    energyEv: ingestion.energyEv,
    i0: ingestion.i0 ?? [],
    i0Err: [],
    iSample: ingestion.iSample ?? [],
    iSampleErr: [],
    iTe: null,
    iTeErr: null,
    od: ingestion.od,
    odErr: ingestion.odErr,
    odNormalized: ingestion.odNormalized ?? ingestion.od,
    massAbsorption: ingestion.massAbsorption ?? null,
    massAbsorptionErr: null,
    beta: ingestion.beta ?? null,
    betaErr: null,
    delta: ingestion.delta ?? null,
    normalization: ingestion.normalization,
    normalizationScale: ingestion.normalizationScale ?? 1,
    bareAtomScale: null,
    bareAtomOffset: null,
    thicknessCm: ingestion.thicknessCm ?? 1e-4,
    formula: ingestion.formula ?? null,
    weightingMode: ingestion.weightingMode,
    kkEngineLabel: ingestion.kkEngineLabel ?? null,
  };
}

function previewRegionToRuntime(region: RegionSpectrum): StxmRegionSpectrumSeries {
  return {
    regionId: region.regionId,
    spotLabel: region.spotLabel,
    sampleLo: 0,
    sampleHi: 0,
    energyEv: region.energyEv,
    signal: region.signal ?? [],
    signalErr: region.signalErr ?? [],
    od: region.od,
    odErr: region.odErr,
    odNormalized: region.odNormalized,
    massAbsorption: region.massAbsorption,
    beta: region.beta,
    delta: region.delta,
    color: region.color ?? "var(--chart-1)",
    isIzero: region.isIzero,
  };
}

function channelValuesFromPoints(
  points: readonly SpectrumPoint[],
): { energyEv: number[]; values: number[]; sigma: number[] } {
  const energyEv: number[] = [];
  const values: number[] = [];
  const sigma: number[] = [];
  for (const point of points) {
    if (!Number.isFinite(point.energy) || !Number.isFinite(point.absorption)) {
      continue;
    }
    energyEv.push(point.energy);
    values.push(point.absorption);
    sigma.push(0.02);
  }
  return { energyEv, values, sigma };
}

function regionSigma(region: RegionSpectrum): number[] {
  if (region.odErr?.some((value) => Number.isFinite(value))) {
    return region.odErr.map((value) =>
      Number.isFinite(value) && value > 0 ? value : 0.02,
    );
  }
  return region.energyEv.map(() => 0.02);
}

function resolveStxmTraceSpectrum(params: {
  traceKey: string;
  channel: StxmPreviewCompareChannel;
  entries: readonly DashboardPreviewSpectrumEntry[];
  ingestionByScanId: Readonly<Record<string, DashboardIngestionResult | undefined>>;
  regionSpectraByScanId: Readonly<
    Record<string, readonly DashboardPreviewRegionSpectrum[] | undefined>
  >;
}): LcfSpectrum | null {
  const parsed = parseStxmPreviewTraceKey(params.traceKey);
  if (!parsed) {
    return null;
  }
  const candidate = listStxmPreviewTraceCandidates({
    entries: params.entries,
    ingestionByScanId: params.ingestionByScanId,
    regionSpectraByScanId: params.regionSpectraByScanId,
  }).find((row) => row.traceKey === params.traceKey);
  if (!candidate) {
    return null;
  }
  const ingestion = params.ingestionByScanId[parsed.scanId];
  const regions = params.regionSpectraByScanId[parsed.scanId] ?? [];
  const label = candidate.isAggregate
    ? `${candidate.scanLabel} (aggregate)`
    : `${candidate.scanLabel} · ${candidate.regionLabel}`;

  if (candidate.isAggregate && ingestion) {
    const runtime = persistedIngestionToRuntime(ingestion);
    const model = buildStxmSpectrumPlotModel({
      result: runtime,
      regionSpectra: [],
      channel: params.channel,
      rawSignalTransform: "signal",
      standards: [],
      bareAtomCurve: null,
      showBareAtomOverlay: false,
      showRegionOverlays: false,
    });
    const mapped = channelValuesFromPoints(model?.points ?? []);
    if (mapped.energyEv.length < 2) {
      return null;
    }
    const sigma =
      params.channel === "od" || params.channel === "od_normalized"
        ? ingestion.odErr.map((value) =>
            Number.isFinite(value) && value > 0 ? value : 0.02,
          )
        : mapped.sigma;
    return {
      energyEv: mapped.energyEv,
      values: mapped.values,
      sigma,
      label,
    };
  }

  const runtimeRegions = regions.map(previewRegionToRuntime);
  const target = runtimeRegions.find(
    (series) => series.regionId === parsed.regionId,
  );
  if (!target) {
    return null;
  }
  const regionRecord = regions.find((row) => row.regionId === parsed.regionId);
  let values: number[] | null = null;
  let sigma: number[] | null = null;
  switch (params.channel) {
    case "od":
      values = target.od ?? null;
      sigma = regionRecord ? regionSigma(regionRecord) : null;
      break;
    case "od_normalized":
      values = target.odNormalized ?? null;
      if (!values?.some(Number.isFinite) && target.od && ingestion?.normalization) {
        const normalized = normalizeNexafsOd(
          Float64Array.from(target.energyEv),
          Float64Array.from(target.od),
          ingestion.normalization,
        );
        values = Array.from(normalized.odNormalized);
      }
      sigma = regionRecord ? regionSigma(regionRecord) : null;
      break;
    case "mass_absorption":
      values = target.massAbsorption ?? null;
      break;
    case "beta":
      values = target.beta ?? null;
      break;
    case "delta":
      values = target.delta ?? null;
      break;
    default:
      values = null;
  }
  if (!values?.some(Number.isFinite)) {
    const izero = izeroRegionSeries(runtimeRegions);
    const validityMask = target.energyEv.map((_, index) => {
      const i0 = izero?.signal[index] ?? Number.NaN;
      const it = target.isIzero ? i0 : (target.signal[index] ?? Number.NaN);
      return Number.isFinite(i0) && Number.isFinite(it);
    });
    const points = pointsFromRegionSeriesForChannel(
      target,
      params.channel,
      "signal",
      izero,
      ingestion?.formula?.trim() ?? null,
      validityMask,
    );
    const mapped = channelValuesFromPoints(points);
    if (mapped.energyEv.length < 2) {
      return null;
    }
    return { ...mapped, label };
  }
  const finiteMask = values.map((value) => Number.isFinite(value));
  const energyEv = target.energyEv.filter((_, index) => finiteMask[index]);
  const filteredValues = values.filter((value) => Number.isFinite(value));
  const filteredSigma = (sigma ?? target.energyEv.map(() => 0.02)).filter(
    (_, index) => finiteMask[index],
  );
  if (energyEv.length < 2) {
    return null;
  }
  return {
    energyEv,
    values: filteredValues,
    sigma: filteredSigma,
    label,
  };
}

function resolveAtlasTraceSpectrum(params: {
  traceKey: string;
  channel: StxmPreviewCompareChannel;
  atlasEntries: readonly DashboardPreviewAtlasEntry[];
  atlasDatasets: readonly DashboardPlotDatasetInput[];
  geometryByExperimentId: Readonly<Record<string, readonly string[] | undefined>>;
}): LcfSpectrum | null {
  const parsed = parsePlotViewerTraceKey(params.traceKey);
  if (!parsed) {
    return null;
  }
  const candidate = listAtlasPreviewTraceCandidates({
    atlasEntries: params.atlasEntries,
    datasets: params.atlasDatasets,
    geometryByExperimentId: params.geometryByExperimentId,
  }).find((row) => row.traceKey === params.traceKey);
  if (!candidate) {
    return null;
  }
  const dataset = params.atlasDatasets.find(
    (row) => row.experimentId === parsed.experimentId,
  );
  if (!dataset) {
    return null;
  }
  const nexafsChannel = stxmPreviewChannelToNexafsChannelId(params.channel);
  const filtered = filterPointsByGeometryKeys(dataset.spectrumPoints, [
    parsed.geometryKey,
  ]);
  const points = buildPlotPointsForChannel(
    nexafsChannel,
    filtered,
    dataset.chemicalFormula,
  );
  const mapped = channelValuesFromPoints(points);
  if (mapped.energyEv.length < 2) {
    return null;
  }
  return {
    ...mapped,
    label: `${candidate.moleculeName} · ${candidate.geometryKey}`,
  };
}

/**
 * Lists every beamtime and Atlas trace that can supply an LCF spectrum for the active channel.
 */
export function listLcfTraceCandidates(params: {
  entries: readonly DashboardPreviewSpectrumEntry[];
  ingestionByScanId: Readonly<Record<string, DashboardIngestionResult | undefined>>;
  regionSpectraByScanId: Readonly<
    Record<string, readonly DashboardPreviewRegionSpectrum[] | undefined>
  >;
  atlasEntries: readonly DashboardPreviewAtlasEntry[];
  atlasDatasets: readonly DashboardPlotDatasetInput[];
  geometryByExperimentId: Readonly<Record<string, readonly string[] | undefined>>;
  channel: StxmPreviewCompareChannel;
}): LcfTraceCandidate[] {
  const stxm = listStxmPreviewTraceCandidates({
    entries: params.entries,
    ingestionByScanId: params.ingestionByScanId,
    regionSpectraByScanId: params.regionSpectraByScanId,
  }).map((candidate) => ({
    traceKey: candidate.traceKey,
    label: candidate.isAggregate
      ? `${candidate.scanLabel} (aggregate)`
      : `${candidate.scanLabel} · ${candidate.regionLabel}`,
    source: "beamtime" as const,
  }));
  const atlas = listAtlasPreviewTraceCandidates({
    atlasEntries: params.atlasEntries,
    datasets: params.atlasDatasets,
    geometryByExperimentId: params.geometryByExperimentId,
  }).map((candidate) => ({
    traceKey: candidate.traceKey,
    label: `${candidate.moleculeName} · ${candidate.geometryKey}`,
    source: "atlas" as const,
  }));
  return [...stxm, ...atlas].filter((candidate) => {
    const spectrum = resolveLcfSpectrumFromTraceKey({
      traceKey: candidate.traceKey,
      channel: params.channel,
      entries: params.entries,
      ingestionByScanId: params.ingestionByScanId,
      regionSpectraByScanId: params.regionSpectraByScanId,
      atlasEntries: params.atlasEntries,
      atlasDatasets: params.atlasDatasets,
      geometryByExperimentId: params.geometryByExperimentId,
    });
    return spectrum != null && spectrum.energyEv.length >= 2;
  });
}

/**
 * Resolves one preview or Atlas trace key into an {@link LcfSpectrum} on the requested channel.
 */
export function resolveLcfSpectrumFromTraceKey(params: {
  traceKey: string;
  channel: StxmPreviewCompareChannel;
  entries: readonly DashboardPreviewSpectrumEntry[];
  ingestionByScanId: Readonly<Record<string, DashboardIngestionResult | undefined>>;
  regionSpectraByScanId: Readonly<
    Record<string, readonly DashboardPreviewRegionSpectrum[] | undefined>
  >;
  atlasEntries: readonly DashboardPreviewAtlasEntry[];
  atlasDatasets: readonly DashboardPlotDatasetInput[];
  geometryByExperimentId: Readonly<Record<string, readonly string[] | undefined>>;
}): LcfSpectrum | null {
  if (isAtlasPreviewCompareTraceKey(params.traceKey)) {
    return resolveAtlasTraceSpectrum(params);
  }
  return resolveStxmTraceSpectrum(params);
}

export { buildStxmPreviewTraceKey, STXM_PREVIEW_AGGREGATE_REGION_ID };
