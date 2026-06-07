import type {
  SpectrumPoint,
  SpectrumYAxisQuantity,
} from "~/components/plots/types";
import { groupPointsByGeometry } from "~/components/plots/utils/trace-utils";
import { abbreviateInstrumentName } from "./abbreviate-instrument-name";
import {
  shortPlotViewerExperimentId,
} from "./plot-viewer-catalog-meta";
import {
  formatPlotViewerAngleDegrees,
  formatPlotViewerGeometryCellLabel,
  resolvePlotViewerAngleSplit,
} from "./format-plot-viewer-geometry-label";
import { channelDefinitionById } from "~/components/plots/data-rail/plot-data-rail-types";
import {
  buildPlotPointsForChannel,
  type NexafsPlotChannelId,
} from "~/features/process-nexafs/nexafs-plot-channels";
import { NEXAFS_PLOT_DATA_RAIL_DEFINITION } from "~/features/process-nexafs/nexafs-plot-data-rail-config";
import { spectrumChannelGlyphForQuantity } from "~/components/plots/spectrum/spectrum-geometry-legend-types";
import type { DashboardPlotDatasetInput } from "./build-dashboard-plot-model";
import {
  filterPointsByGeometryKeys,
  geometryKeyFromPoint,
} from "./geometry-keys";
import type { PlotViewerDescriptorField } from "./plot-viewer-legend";
import {
  buildPlotViewerStyleContext,
  resolvePlotViewerTraceStyle,
  type PlotViewerLineDash,
  type PlotViewerLineStyleBy,
  type PlotViewerMarkerSymbol,
  type PlotViewerPaletteId,
  type PlotViewerStyleMappingField,
} from "./plot-viewer-trace-styles";
import { buildPlotViewerTraceKey } from "./plot-viewer-trace-key";
import type {
  PlotViewerExperimentColorMode,
  PlotViewerTraceStyleOverride,
} from "./plot-viewer-style-overrides";

export type PlotViewerCatalogMeta = {
  experimentId: string;
  moleculeName: string;
  edgeLabel: string;
  instrumentName: string;
  facilityName: string;
};

export type PlotViewerStyledTrace = {
  traceKey: string;
  experimentId: string;
  geometryKey: string;
  geometrySortKey: string;
  datasetOrder: number;
  geometryIndex: number;
  label: string;
  points: SpectrumPoint[];
  color: string;
  lineDash: PlotViewerLineDash;
  markerSymbol: PlotViewerMarkerSymbol;
  lineWidth: number;
  markerEvery?: number;
  markerSize: number;
  legendId: string;
  channelGlyph: string;
  descriptors: Record<PlotViewerDescriptorField, string>;
};

function traceHasFiniteAbsorption(points: readonly SpectrumPoint[]): boolean {
  return points.some(
    (point) =>
      Number.isFinite(point.energy) && Number.isFinite(point.absorption),
  );
}

function isUuidLike(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(value.trim());
}

function descriptorFallbackLabel(
  datasetLabel: string,
  experimentId: string,
): string {
  if (isUuidLike(datasetLabel)) {
    return shortPlotViewerExperimentId(experimentId);
  }
  return datasetLabel;
}

function descriptorValues(params: {
  meta: PlotViewerCatalogMeta | undefined;
  datasetLabel: string;
  experimentId: string;
  geometryKey: string;
  fixedLabel?: string;
  theta?: number;
  phi?: number;
  angleSplit: ReturnType<typeof resolvePlotViewerAngleSplit>;
}): Record<PlotViewerDescriptorField, string> {
  const fallback = descriptorFallbackLabel(
    params.datasetLabel,
    params.experimentId,
  );
  const angleLabel = formatPlotViewerGeometryCellLabel({
    geometryKey: params.geometryKey,
    theta: params.theta,
    phi: params.phi,
    fixedLabel: params.fixedLabel,
    split: params.angleSplit,
  });
  const instrumentName = params.meta?.instrumentName ?? fallback;
  return {
    theta: formatPlotViewerAngleDegrees(params.theta),
    phi: formatPlotViewerAngleDegrees(params.phi),
    thetaPhi: angleLabel,
    region: angleLabel,
    molecule: params.meta?.moleculeName ?? fallback,
    edge: params.meta?.edgeLabel ?? fallback,
    instrument: abbreviateInstrumentName(instrumentName),
    facility: params.meta?.facilityName ?? fallback,
    experiment: shortPlotViewerExperimentId(params.experimentId),
  };
}

/**
 * Expands selected catalog datasets into styled traces with experiment colors and geometry dashes.
 */
export function buildPlotViewerStyledTraces(params: {
  datasets: readonly DashboardPlotDatasetInput[];
  catalogMetaByExperimentId: ReadonlyMap<string, PlotViewerCatalogMeta>;
  channelId: NexafsPlotChannelId;
  selectedGeometryKeys: readonly string[];
  paletteId: PlotViewerPaletteId;
  colorBy: PlotViewerStyleMappingField;
  lineStyleBy: PlotViewerLineStyleBy;
  markerBy: PlotViewerStyleMappingField;
  isDark: boolean;
  colorOverrides?: Readonly<Record<string, string>>;
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
  yAxisQuantity: SpectrumYAxisQuantity;
  channelGlyph: string;
  isEmpty: boolean;
} {
  const yAxisQuantity = channelDefinitionById(
    NEXAFS_PLOT_DATA_RAIL_DEFINITION,
    params.channelId,
  ).yAxisQuantity;
  const channelGlyph = spectrumChannelGlyphForQuantity(yAxisQuantity);
  const traceDrafts: Array<{
    traceKey: string;
    experimentId: string;
    geometryKey: string;
    geometrySortKey: string;
    datasetOrder: number;
    geometryIndex: number;
    label: string;
    points: SpectrumPoint[];
    meta: PlotViewerCatalogMeta | undefined;
    datasetLabel: string;
    fixedLabel?: string;
    theta?: number;
    phi?: number;
  }> = [];

  params.datasets.forEach((dataset, datasetOrder) => {
    const meta = params.catalogMetaByExperimentId.get(dataset.experimentId);

    const filtered = filterPointsByGeometryKeys(
      dataset.spectrumPoints,
      params.selectedGeometryKeys,
    );
    const channelPoints = buildPlotPointsForChannel(
      params.channelId,
      filtered,
      dataset.chemicalFormula,
    );
    if (!traceHasFiniteAbsorption(channelPoints)) {
      return;
    }

    const groups = groupPointsByGeometry(channelPoints);
    const geometryEntries = [...groups.entries()].sort((left, right) =>
      left[0].localeCompare(right[0]),
    );

    geometryEntries.forEach(([geometryKey, group], geometryIndex) => {
      const points =
        geometryKey === "fixed"
          ? channelPoints.filter(
              (point) => geometryKeyFromPoint(point) === "fixed",
            )
          : channelPoints.filter(
              (point) => geometryKeyFromPoint(point) === geometryKey,
            );
      if (!traceHasFiniteAbsorption(points)) {
        return;
      }

      const traceKey = buildPlotViewerTraceKey(
        dataset.experimentId,
        geometryKey,
      );
      const geomSuffix =
        geometryEntries.length <= 1 ? "" : ` — ${group.label}`;
      traceDrafts.push({
        traceKey,
        experimentId: dataset.experimentId,
        geometryKey,
        geometrySortKey: geometryKey,
        datasetOrder,
        geometryIndex,
        label: `${dataset.label}${geomSuffix}`.trim(),
        points,
        meta,
        datasetLabel: dataset.label,
        fixedLabel: group.label,
        theta: group.theta,
        phi: group.phi,
      });
    });
  });

  const angleSplit = resolvePlotViewerAngleSplit(
    traceDrafts.map((draft) => draft.geometryKey),
  );

  const styleContext = buildPlotViewerStyleContext({
    descriptorRows: traceDrafts.map((draft) =>
      descriptorValues({
        meta: draft.meta,
        datasetLabel: draft.datasetLabel,
        experimentId: draft.experimentId,
        geometryKey: draft.geometryKey,
        fixedLabel: draft.fixedLabel,
        theta: draft.theta,
        phi: draft.phi,
        angleSplit,
      }),
    ),
    colorBy: params.colorBy,
    lineStyleBy: params.lineStyleBy,
    markerBy: params.markerBy,
  });

  const traces: PlotViewerStyledTrace[] = traceDrafts.map((draft) => {
    const descriptors = descriptorValues({
      meta: draft.meta,
      datasetLabel: draft.datasetLabel,
      experimentId: draft.experimentId,
      geometryKey: draft.geometryKey,
      fixedLabel: draft.fixedLabel,
      theta: draft.theta,
      phi: draft.phi,
      angleSplit,
    });
    const style = resolvePlotViewerTraceStyle({
      traceKey: draft.traceKey,
      descriptors,
      experimentId: draft.experimentId,
      colorBy: params.colorBy,
      lineStyleBy: params.lineStyleBy,
      markerBy: params.markerBy,
      styleContext,
      paletteId: params.paletteId,
      isDark: params.isDark,
      colorOverrides: params.colorOverrides,
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
      descriptors,
      color: style.color,
      lineDash: style.lineDash,
      markerSymbol: style.markerSymbol,
      lineWidth: style.lineWidth,
      markerEvery: style.markerEvery,
      markerSize: style.markerSize,
      legendId: draft.traceKey,
      channelGlyph,
    };
  });

  return {
    traces,
    yAxisQuantity,
    channelGlyph,
    isEmpty: traces.length === 0,
  };
}
