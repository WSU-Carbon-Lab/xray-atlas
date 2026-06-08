import type { SpectrumPoint } from "~/components/plots/types";
import { channelDefinitionById } from "~/components/plots/data-rail";
import type {
  DashboardIngestionResult,
  DashboardPreviewAtlasEntry,
  DashboardPreviewRegionSpectrum,
  DashboardPreviewSpectrumEntry,
} from "~/lib/dashboard-processing-session";
import { buildStxmSpectrumPlotModel } from "~/features/dashboard/lib/stxm-to-spectrum-plot";
import {
  buildStxmRegionLegendSpotLabel,
  buildStxmRegionTraceLabel,
  izeroRegionSeries,
  pointsFromRegionSeriesForChannel,
} from "~/features/dashboard/lib/stxm-region-traces";
import type { PlotViewerDescriptorField } from "~/features/dashboard/plot-viewer/plot-viewer-legend";
import type { PlotViewerStyledTrace } from "~/features/dashboard/plot-viewer/plot-viewer-styled-traces";
import {
  buildPlotViewerStyleContext,
  resolvePlotViewerTraceStyle,
  type PlotViewerLineDash,
  type PlotViewerLineStyleBy,
  type PlotViewerMarkerSymbol,
  type PlotViewerPaletteId,
  type PlotViewerStyleMappingField,
} from "~/features/dashboard/plot-viewer/plot-viewer-trace-styles";
import type {
  PlotViewerExperimentColorMode,
  PlotViewerTraceStyleOverride,
} from "~/features/dashboard/plot-viewer/plot-viewer-style-overrides";
import type { StxmIngestionResult } from "~/features/dashboard/lib/computeStxmIngestion";
import type { StxmIngestionPlotChannel } from "~/lib/stxm/stxm-ingestion-display";
import { normalizeNexafsOd } from "~/lib/stxm/normalization";
import { STXM_INGESTION_PLOT_DATA_RAIL_DEFINITION } from "~/lib/stxm/stxm-ingestion-plot-data-rail-config";
import type { StxmRegionSpectrumSeries } from "~/lib/stxm/stxm-region-types";
import { stxmSpectrumPointsHaveFiniteAbsorption } from "~/lib/stxm/sanitize-stxm-signal-points";
import {
  buildStxmPreviewTraceKey,
  STXM_PREVIEW_AGGREGATE_REGION_ID,
} from "./stxm-preview-trace-key";
import type { DashboardPlotDatasetInput } from "~/features/dashboard/plot-viewer/build-dashboard-plot-model";
import {
  buildPlotViewerStyledTraces,
  type PlotViewerCatalogMeta,
} from "~/features/dashboard/plot-viewer/plot-viewer-styled-traces";
import { buildPlotViewerTraceKey, parsePlotViewerTraceKey } from "~/features/dashboard/plot-viewer/plot-viewer-trace-key";
import { formatPlotViewerAngleDegrees } from "~/features/dashboard/plot-viewer/format-plot-viewer-geometry-label";
import { resolvePlotViewerRegionDescriptor } from "~/features/dashboard/plot-viewer/plot-viewer-region-descriptor";
import { geometryKeysForPoints } from "~/features/dashboard/plot-viewer/geometry-selection";
import type { NexafsPlotChannelId } from "~/features/process-nexafs/nexafs-plot-channels";
import { partitionPreviewCompareTraceKeys } from "./preview-compare-trace-key";

/** Y channels exposed on the STXM preview compare plot header. */
export const STXM_PREVIEW_COMPARE_CHANNELS = [
  "od",
  "od_normalized",
  "mass_absorption",
  "beta",
  "delta",
] as const satisfies readonly StxmIngestionPlotChannel[];

export type StxmPreviewCompareChannel =
  (typeof STXM_PREVIEW_COMPARE_CHANNELS)[number];

export const DEFAULT_STXM_PREVIEW_COLOR_BY: PlotViewerStyleMappingField =
  "molecule";

export const DEFAULT_STXM_PREVIEW_LINE_STYLE_BY: PlotViewerLineStyleBy =
  "experiment";

export const DEFAULT_STXM_PREVIEW_MARKER_BY: PlotViewerStyleMappingField =
  "edge";

export const DEFAULT_STXM_PREVIEW_DESCRIPTOR_FIELDS: readonly PlotViewerDescriptorField[] =
  ["region", "molecule", "edge"];

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

function previewRegionToRuntime(
  region: DashboardPreviewRegionSpectrum,
): StxmRegionSpectrumSeries {
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

function displayScanLabel(entry: DashboardPreviewSpectrumEntry): string {
  const molecule = entry.moleculeName?.trim();
  if (molecule) {
    return molecule;
  }
  return shortScanLabel(entry.scanId, entry.scanLabel);
}

/**
 * Maps STXM preview compare channels to NEXAFS plot viewer channel ids for Atlas overlays.
 */
export function stxmPreviewChannelToNexafsChannelId(
  channel: StxmPreviewCompareChannel,
): NexafsPlotChannelId {
  switch (channel) {
    case "od":
    case "od_normalized":
      return "normalized";
    case "mass_absorption":
      return "mass-absorption";
    case "beta":
      return "beta";
    case "delta":
      return "delta";
    default:
      return "normalized";
  }
}

function shortScanLabel(scanId: string, scanLabel: string): string {
  const trimmed = scanLabel.trim();
  if (trimmed.length > 0) {
    return trimmed;
  }
  const parts = scanId.split("/");
  return parts[parts.length - 1] ?? scanId;
}

export type StxmPreviewTraceCandidate = {
  traceKey: string;
  scanId: string;
  regionId: string;
  scanLabel: string;
  fileLabel: string;
  regionLabel: string;
  edgeLabel: string;
  isAggregate: boolean;
  incidentThetaDeg?: number;
};

/**
 * Lists every trace that can be plotted from cached preview ingestion and region spectra.
 */
export function listStxmPreviewTraceCandidates(params: {
  entries: readonly DashboardPreviewSpectrumEntry[];
  ingestionByScanId: Readonly<
    Record<string, DashboardIngestionResult | undefined>
  >;
  regionSpectraByScanId: Readonly<
    Record<string, readonly DashboardPreviewRegionSpectrum[] | undefined>
  >;
}): StxmPreviewTraceCandidate[] {
  const candidates: StxmPreviewTraceCandidate[] = [];
  for (const entry of params.entries) {
    const edgeLabel = entry.edgeLabel?.trim() ?? "Edge unknown";
    const fileLabel = shortScanLabel(entry.scanId, entry.scanLabel);
    const scanLabel = displayScanLabel(entry);
    const incidentThetaDeg = entry.incidentThetaDeg;
    const regions = params.regionSpectraByScanId[entry.scanId] ?? [];
    const sampleRegions = regions.filter((region) => !region.isIzero);
    if (sampleRegions.length > 0) {
      for (const region of sampleRegions) {
        candidates.push({
          traceKey: buildStxmPreviewTraceKey(entry.scanId, region.regionId),
          scanId: entry.scanId,
          regionId: region.regionId,
          scanLabel,
          fileLabel,
          regionLabel: buildStxmRegionLegendSpotLabel(region.spotLabel),
          edgeLabel,
          isAggregate: false,
          incidentThetaDeg,
        });
      }
      continue;
    }
    if (params.ingestionByScanId[entry.scanId]) {
      candidates.push({
        traceKey: buildStxmPreviewTraceKey(
          entry.scanId,
          STXM_PREVIEW_AGGREGATE_REGION_ID,
        ),
        scanId: entry.scanId,
        regionId: STXM_PREVIEW_AGGREGATE_REGION_ID,
        scanLabel,
        fileLabel,
        regionLabel: "Aggregate",
        edgeLabel,
        isAggregate: true,
        incidentThetaDeg,
      });
    }
  }
  return candidates;
}

/**
 * Returns default selected trace keys: all sample regions per cached scan, or aggregate ingestion when regions are absent.
 */
export function defaultStxmPreviewTraceKeys(
  candidates: readonly StxmPreviewTraceCandidate[],
): string[] {
  return candidates.map((candidate) => candidate.traceKey);
}

function buildAggregatePoints(
  ingestion: DashboardIngestionResult,
  channel: StxmPreviewCompareChannel,
): SpectrumPoint[] {
  const runtime = persistedIngestionToRuntime(ingestion);
  const model = buildStxmSpectrumPlotModel({
    result: runtime,
    regionSpectra: [],
    channel,
    rawSignalTransform: "signal",
    standards: [],
    bareAtomCurve: null,
    showBareAtomOverlay: false,
    showRegionOverlays: false,
  });
  return model?.points ?? [];
}

function previewRegionChannelValues(
  region: StxmRegionSpectrumSeries,
  channel: StxmPreviewCompareChannel,
): number[] | null {
  switch (channel) {
    case "od":
      return region.od ?? null;
    case "od_normalized":
      return region.odNormalized ?? null;
    case "mass_absorption":
      return region.massAbsorption ?? null;
    case "beta":
      return region.beta ?? null;
    case "delta":
      return region.delta ?? null;
    default:
      return null;
  }
}

function applyIngestionNormalizationToOd(
  energyEv: readonly number[],
  od: readonly number[],
  ingestion: DashboardIngestionResult | undefined,
): number[] | null {
  const windows = ingestion?.normalization;
  if (!windows) {
    return null;
  }
  const finiteOd = od.filter((value) => Number.isFinite(value));
  if (finiteOd.length === 0) {
    return null;
  }
  const { odNormalized } = normalizeNexafsOd(
    Float64Array.from(energyEv),
    Float64Array.from(od),
    windows,
  );
  return Array.from(odNormalized);
}

function buildRegionPoints(
  regions: readonly DashboardPreviewRegionSpectrum[],
  regionId: string,
  channel: StxmPreviewCompareChannel,
  formula: string | null,
  ingestion?: DashboardIngestionResult,
): SpectrumPoint[] {
  const runtimeRegions = regions.map(previewRegionToRuntime);
  const target = runtimeRegions.find((series) => series.regionId === regionId);
  if (!target) {
    return [];
  }
  let cachedValues = previewRegionChannelValues(target, channel);
  if (
    channel === "od_normalized" &&
    !cachedValues?.some((value) => Number.isFinite(value)) &&
    target.od?.some((value) => Number.isFinite(value))
  ) {
    cachedValues = applyIngestionNormalizationToOd(
      target.energyEv,
      target.od ?? [],
      ingestion,
    );
  }
  if (cachedValues?.some((value) => Number.isFinite(value))) {
    return target.energyEv
      .map((energy, index) => ({
        energy,
        absorption: cachedValues[index] ?? Number.NaN,
      }))
      .filter((point) => Number.isFinite(point.absorption));
  }
  const izero = izeroRegionSeries(runtimeRegions);
  const validityMask = target.energyEv.map((_, index) => {
    const i0 = izero?.signal[index] ?? Number.NaN;
    const it = target.isIzero ? i0 : (target.signal[index] ?? Number.NaN);
    return Number.isFinite(i0) && Number.isFinite(it);
  });
  return pointsFromRegionSeriesForChannel(
    target,
    channel,
    "signal",
    izero,
    formula,
    validityMask,
  );
}

/**
 * Expands selected preview traces into styled plot-viewer traces for overlay comparison.
 */
export function buildStxmPreviewStyledTraces(params: {
  entries: readonly DashboardPreviewSpectrumEntry[];
  ingestionByScanId: Readonly<
    Record<string, DashboardIngestionResult | undefined>
  >;
  regionSpectraByScanId: Readonly<
    Record<string, readonly DashboardPreviewRegionSpectrum[] | undefined>
  >;
  selectedTraceKeys: readonly string[];
  channel: StxmPreviewCompareChannel;
  paletteId: PlotViewerPaletteId;
  colorBy: PlotViewerStyleMappingField;
  lineStyleBy: PlotViewerLineStyleBy;
  markerBy: PlotViewerStyleMappingField;
  isDark: boolean;
  experimentColorMode?: Readonly<Record<string, PlotViewerExperimentColorMode>>;
  experimentFixedColor?: Readonly<Record<string, string>>;
  lineDashOverrides?: Readonly<Record<string, PlotViewerLineDash>>;
  markerOverrides?: Readonly<Record<string, PlotViewerMarkerSymbol>>;
  experimentLineDashOverrides?: Readonly<Record<string, PlotViewerLineDash>>;
  experimentLineWidthOverrides?: Readonly<Record<string, number>>;
  experimentMarkerOverrides?: Readonly<Record<string, PlotViewerMarkerSymbol>>;
  experimentMarkerSizeOverrides?: Readonly<Record<string, number>>;
  experimentMarkerEveryOverrides?: Readonly<Record<string, number>>;
  traceOverrides?: Readonly<Record<string, PlotViewerTraceStyleOverride>>;
}): {
  traces: PlotViewerStyledTrace[];
  isEmpty: boolean;
  channelGlyph: string;
} {
  const candidates = listStxmPreviewTraceCandidates({
    entries: params.entries,
    ingestionByScanId: params.ingestionByScanId,
    regionSpectraByScanId: params.regionSpectraByScanId,
  });
  const candidateByKey = new Map(
    candidates.map((candidate) => [candidate.traceKey, candidate]),
  );
  const channelGlyph = channelDefinitionById(
    STXM_INGESTION_PLOT_DATA_RAIL_DEFINITION,
    params.channel,
  ).label;

  const drafts: Array<{
    traceKey: string;
    experimentId: string;
    geometryKey: string;
    geometrySortKey: string;
    datasetOrder: number;
    geometryIndex: number;
    label: string;
    points: SpectrumPoint[];
    descriptors: Record<PlotViewerDescriptorField, string>;
  }> = [];

  params.selectedTraceKeys.forEach((traceKey, datasetOrder) => {
    const candidate = candidateByKey.get(traceKey);
    if (!candidate) {
      return;
    }
    const ingestion = params.ingestionByScanId[candidate.scanId];
    const regions = params.regionSpectraByScanId[candidate.scanId] ?? [];
    const formula = ingestion?.formula?.trim() ?? null;
    const points = candidate.isAggregate
      ? ingestion
        ? buildAggregatePoints(ingestion, params.channel)
        : []
      : buildRegionPoints(
          regions,
          candidate.regionId,
          params.channel,
          formula,
          ingestion,
        );
    if (!stxmSpectrumPointsHaveFiniteAbsorption(points)) {
      return;
    }
    const regionDescriptor = resolvePlotViewerRegionDescriptor({
      regionLabel: candidate.regionLabel,
      theta: candidate.incidentThetaDeg,
    });
    const thetaLabel = formatPlotViewerAngleDegrees(candidate.incidentThetaDeg);
    const thetaPhi =
      regionDescriptor.length > 0
        ? `${candidate.scanLabel} · ${regionDescriptor}`
        : candidate.scanLabel;
    drafts.push({
      traceKey,
      experimentId: candidate.scanId,
      geometryKey: candidate.regionId,
      geometrySortKey: candidate.regionLabel,
      datasetOrder,
      geometryIndex: datasetOrder,
      label: candidate.isAggregate
        ? `${candidate.scanLabel} (${channelGlyph})`
        : buildStxmRegionTraceLabel(params.channel, candidate.regionLabel),
      points,
      descriptors: {
        theta: thetaLabel,
        phi: "",
        thetaPhi,
        region: regionDescriptor,
        molecule: candidate.scanLabel,
        edge: candidate.edgeLabel,
        instrument: candidate.fileLabel,
        facility: "Local cache",
        experiment: candidate.regionLabel,
      },
    });
  });

  const styleContext = buildPlotViewerStyleContext({
    descriptorRows: drafts.map((draft) => draft.descriptors),
    colorBy: params.colorBy,
    lineStyleBy: params.lineStyleBy,
    markerBy: params.markerBy,
  });

  const traces: PlotViewerStyledTrace[] = drafts.map((draft) => {
    const style = resolvePlotViewerTraceStyle({
      traceKey: draft.traceKey,
      experimentId: draft.experimentId,
      descriptors: draft.descriptors,
      paletteId: params.paletteId,
      colorBy: params.colorBy,
      lineStyleBy: params.lineStyleBy,
      markerBy: params.markerBy,
      isDark: params.isDark,
      styleContext,
      experimentColorMode: params.experimentColorMode,
      experimentFixedColor: params.experimentFixedColor,
      lineDashOverrides: params.lineDashOverrides,
      markerOverrides: params.markerOverrides,
      experimentLineDashOverrides: params.experimentLineDashOverrides,
      experimentLineWidthOverrides: params.experimentLineWidthOverrides,
      experimentMarkerOverrides: params.experimentMarkerOverrides,
      experimentMarkerSizeOverrides: params.experimentMarkerSizeOverrides,
      experimentMarkerEveryOverrides: params.experimentMarkerEveryOverrides,
      traceOverrides: params.traceOverrides,
    });
    return {
      traceKey: draft.traceKey,
      experimentId: draft.experimentId,
      geometryKey: draft.geometryKey,
      geometrySortKey: draft.geometrySortKey,
      datasetOrder: draft.datasetOrder,
      geometryIndex: draft.geometryIndex,
      label: draft.label,
      points: draft.points,
      color: style.color,
      lineDash: style.lineDash,
      markerSymbol: style.markerSymbol,
      lineWidth: style.lineWidth,
      markerEvery: style.markerEvery,
      markerSize: style.markerSize,
      legendId: draft.traceKey,
      channelGlyph,
      descriptors: draft.descriptors,
    };
  });

  return {
    traces,
    isEmpty: traces.length === 0,
    channelGlyph,
  };
}

export type AtlasPreviewTraceCandidate = {
  traceKey: string;
  experimentId: string;
  geometryKey: string;
  label: string;
  edgeLabel: string;
  moleculeName: string;
  instrumentName: string;
  facilityName: string;
};

/**
 * Lists Atlas NEXAFS geometry traces available for preview compare from persisted experiment picks.
 */
export function listAtlasPreviewTraceCandidates(params: {
  atlasEntries: readonly DashboardPreviewAtlasEntry[];
  datasets: readonly DashboardPlotDatasetInput[];
  geometryByExperimentId: Readonly<Record<string, readonly string[] | undefined>>;
}): AtlasPreviewTraceCandidate[] {
  const candidates: AtlasPreviewTraceCandidate[] = [];
  for (const entry of params.atlasEntries) {
    const dataset = params.datasets.find(
      (row) => row.experimentId === entry.experimentId,
    );
    const geometryKeys =
      params.geometryByExperimentId[entry.experimentId] ??
      (dataset ? geometryKeysForPoints(dataset.spectrumPoints) : []);
    for (const geometryKey of geometryKeys) {
      candidates.push({
        traceKey: buildPlotViewerTraceKey(entry.experimentId, geometryKey),
        experimentId: entry.experimentId,
        geometryKey,
        label: entry.label,
        edgeLabel: entry.edgeLabel?.trim() ?? "",
        moleculeName: entry.moleculeName?.trim() ?? entry.label,
        instrumentName: entry.instrumentName?.trim() ?? "",
        facilityName: entry.facilityName?.trim() ?? "Atlas",
      });
    }
  }
  return candidates;
}

/**
 * Builds default selected trace keys for newly added Atlas experiments (all resolved geometries).
 */
export function defaultAtlasPreviewTraceKeys(
  candidates: readonly AtlasPreviewTraceCandidate[],
  experimentId: string,
): string[] {
  return candidates
    .filter((candidate) => candidate.experimentId === experimentId)
    .map((candidate) => candidate.traceKey);
}

type PreviewCompareStyleParams = Omit<
  Parameters<typeof buildStxmPreviewStyledTraces>[0],
  "selectedTraceKeys"
> & {
  selectedTraceKeys: readonly string[];
  atlasEntries?: readonly DashboardPreviewAtlasEntry[];
  atlasDatasets?: readonly DashboardPlotDatasetInput[];
  atlasGeometryByExperimentId?: Readonly<
    Record<string, readonly string[] | undefined>
  >;
  catalogMetaByExperimentId?: ReadonlyMap<string, PlotViewerCatalogMeta>;
};

/**
 * Expands mixed STXM cache and Atlas catalog selections into styled overlay traces.
 */
export function buildPreviewCompareStyledTraces(
  params: PreviewCompareStyleParams,
): {
  traces: PlotViewerStyledTrace[];
  isEmpty: boolean;
  channelGlyph: string;
} {
  const { stxmTraceKeys, atlasTraceKeys } = partitionPreviewCompareTraceKeys(
    params.selectedTraceKeys,
  );

  const stxmStyled = buildStxmPreviewStyledTraces({
    ...params,
    selectedTraceKeys: stxmTraceKeys,
  });

  const atlasEntries = params.atlasEntries ?? [];
  const atlasDatasets = params.atlasDatasets ?? [];
  if (atlasTraceKeys.length === 0 || atlasEntries.length === 0) {
    return stxmStyled;
  }

  const nexafsChannel = stxmPreviewChannelToNexafsChannelId(params.channel);
  const selectedExperimentIds = [
    ...new Set(
      atlasTraceKeys
        .map((key) => key.split(":")[0])
        .filter((value): value is string => Boolean(value)),
    ),
  ];
  const selectedGeometryKeys = [
    ...new Set(
      atlasTraceKeys
        .map((key) => parsePlotViewerTraceKey(key)?.geometryKey)
        .filter((value): value is string => Boolean(value)),
    ),
  ];

  const catalogMeta =
    params.catalogMetaByExperimentId ??
    new Map(
      atlasEntries.map((entry) => [
        entry.experimentId,
        {
          experimentId: entry.experimentId,
          moleculeName: entry.moleculeName ?? entry.label,
          edgeLabel: entry.edgeLabel ?? "",
          instrumentName: entry.instrumentName ?? "",
          facilityName: entry.facilityName ?? "Atlas",
        } satisfies PlotViewerCatalogMeta,
      ]),
    );

  const filteredDatasets = atlasDatasets.filter((dataset) =>
    selectedExperimentIds.includes(dataset.experimentId),
  );

  const atlasStyled = buildPlotViewerStyledTraces({
    datasets: filteredDatasets,
    catalogMetaByExperimentId: catalogMeta,
    channelId: nexafsChannel,
    selectedGeometryKeys,
    paletteId: params.paletteId,
    colorBy: params.colorBy,
    lineStyleBy: params.lineStyleBy,
    markerBy: params.markerBy,
    isDark: params.isDark,
    experimentColorMode: params.experimentColorMode,
    experimentFixedColor: params.experimentFixedColor,
    lineDashOverrides: params.lineDashOverrides,
    markerOverrides: params.markerOverrides,
    experimentLineDashOverrides: params.experimentLineDashOverrides,
    experimentLineWidthOverrides: params.experimentLineWidthOverrides,
    experimentMarkerOverrides: params.experimentMarkerOverrides,
    experimentMarkerSizeOverrides: params.experimentMarkerSizeOverrides,
    experimentMarkerEveryOverrides: params.experimentMarkerEveryOverrides,
    traceOverrides: params.traceOverrides,
  });

  const atlasTraceByKey = new Map(
    atlasStyled.traces
      .filter((trace) => atlasTraceKeys.includes(trace.traceKey))
      .map((trace) => [trace.traceKey, trace]),
  );
  const stxmTraceByKey = new Map(
    stxmStyled.traces.map((trace) => [trace.traceKey, trace]),
  );

  const traces: PlotViewerStyledTrace[] = [];
  params.selectedTraceKeys.forEach((traceKey, datasetOrder) => {
    const trace = stxmTraceByKey.get(traceKey) ?? atlasTraceByKey.get(traceKey);
    if (!trace) {
      return;
    }
    traces.push({ ...trace, datasetOrder });
  });

  return {
    traces,
    isEmpty: traces.length === 0,
    channelGlyph: stxmStyled.channelGlyph,
  };
}
