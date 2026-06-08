import { plotViewerExperimentLabelFromMeta } from "./plot-viewer-catalog-meta";
import type {
  PlotViewerCatalogMeta,
  PlotViewerStyledTrace,
} from "./plot-viewer-styled-traces";
import type {
  PlotViewerExperimentColorMode,
  PlotViewerTraceStyleOverride,
} from "./plot-viewer-style-overrides";
import {
  buildPlotViewerStyleContext,
  PLOT_VIEWER_DEFAULT_LINE_WIDTH,
  PLOT_VIEWER_DEFAULT_MARKER_SIZE,
  resolvePlotViewerTraceStyle,
  type PlotViewerLineDash,
  type PlotViewerLineStyleBy,
  type PlotViewerMarkerSymbol,
  type PlotViewerPaletteId,
  type PlotViewerStyleMappingField,
} from "./plot-viewer-trace-styles";

export type PlotViewerTraceStyleListItem = {
  traceKey: string;
  label: string;
  inheritedColor: string;
  inheritedLineDash: PlotViewerLineDash;
  inheritedMarker: PlotViewerMarkerSymbol;
  inheritedLineWidth: number;
  inheritedMarkerSize: number;
  inheritedMarkerEvery?: number;
  effectiveColor: string;
  effectiveLineDash: PlotViewerLineDash;
  effectiveMarker: PlotViewerMarkerSymbol;
  effectiveLineWidth: number;
  effectiveMarkerEvery?: number;
  effectiveMarkerSize: number;
  hasColorOverride: boolean;
  hasLineDashOverride: boolean;
  hasMarkerOverride: boolean;
  hasLineWidthOverride: boolean;
  hasMarkerEveryOverride: boolean;
  hasMarkerSizeOverride: boolean;
};

export type PlotViewerExperimentStyleItem = {
  experimentId: string;
  label: string;
  colorMode: PlotViewerExperimentColorMode;
  schemeColor: string;
  fixedColor: string;
  effectiveColor: string;
  inheritedLineDash: PlotViewerLineDash;
  inheritedMarker: PlotViewerMarkerSymbol;
  inheritedLineWidth: number;
  inheritedMarkerSize: number;
  effectiveLineDash: PlotViewerLineDash;
  effectiveMarker: PlotViewerMarkerSymbol;
  effectiveLineWidth: number;
  effectiveMarkerEvery?: number;
  effectiveMarkerSize: number;
  hasLineDashOverride: boolean;
  hasLineWidthOverride: boolean;
  hasMarkerOverride: boolean;
  hasMarkerEveryOverride: boolean;
  hasMarkerSizeOverride: boolean;
  traces: PlotViewerTraceStyleListItem[];
};

function compactTraceLabel(trace: PlotViewerStyledTrace): string {
  const parts = [trace.descriptors.thetaPhi, trace.descriptors.instrument].filter(
    (part) => part.trim().length > 0,
  );
  return parts.join(" · ");
}

function styleOverrideFlags(
  traceKey: string,
  traceOverrides: Readonly<Record<string, PlotViewerTraceStyleOverride>> | undefined,
): {
  hasColorOverride: boolean;
  hasLineDashOverride: boolean;
  hasMarkerOverride: boolean;
  hasLineWidthOverride: boolean;
  hasMarkerEveryOverride: boolean;
  hasMarkerSizeOverride: boolean;
} {
  const override = traceOverrides?.[traceKey];
  return {
    hasColorOverride: Boolean(override?.color),
    hasLineDashOverride: Boolean(override?.lineDash),
    hasMarkerOverride: Boolean(override?.marker),
    hasLineWidthOverride: Boolean(override?.lineWidth),
    hasMarkerEveryOverride: Boolean(override?.markerEvery),
    hasMarkerSizeOverride: Boolean(override?.markerSize),
  };
}

/**
 * Builds one accordion row per selected experiment with per-trace style rows for rendered geometries.
 */
export function buildPlotViewerExperimentStyleItems(params: {
  experimentIds: readonly string[];
  catalogMetaByExperimentId: ReadonlyMap<string, PlotViewerCatalogMeta>;
  traces: readonly PlotViewerStyledTrace[];
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
}): PlotViewerExperimentStyleItem[] {
  if (params.experimentIds.length === 0) {
    return [];
  }

  const styleContext = buildPlotViewerStyleContext({
    descriptorRows: params.traces.map((trace) => trace.descriptors),
    colorBy: params.colorBy,
    lineStyleBy: params.lineStyleBy,
    markerBy: params.markerBy,
  });

  return params.experimentIds.map((experimentId) => {
    const experimentTraces = params.traces.filter(
      (trace) => trace.experimentId === experimentId,
    );
    const meta = params.catalogMetaByExperimentId.get(experimentId);
    const label = plotViewerExperimentLabelFromMeta(meta, experimentId);
    const referenceTrace = experimentTraces[0];

    const legacyColor = params.colorOverrides?.[experimentId]?.trim();
    const colorMode =
      params.experimentColorMode?.[experimentId] ??
      (legacyColor ? "fixed" : "scheme");

    const schemeStyle =
      referenceTrace != null
        ? resolvePlotViewerTraceStyle({
            traceKey: referenceTrace.traceKey,
            descriptors: referenceTrace.descriptors,
            experimentId,
            colorBy: params.colorBy,
            lineStyleBy: params.lineStyleBy,
            markerBy: params.markerBy,
            styleContext,
            paletteId: params.paletteId,
            isDark: params.isDark,
            experimentColorMode: { [experimentId]: "scheme" },
            lineDashOverrides: params.lineDashOverrides,
            markerOverrides: params.markerOverrides,
            traceOverrides: {},
          })
        : {
            color: "#6b7280",
            lineDash: "solid" as const,
            markerSymbol: "circle" as const,
            lineWidth: PLOT_VIEWER_DEFAULT_LINE_WIDTH,
            markerSize: PLOT_VIEWER_DEFAULT_MARKER_SIZE,
            markerEvery: undefined,
          };

    const fixedColor =
      params.experimentFixedColor?.[experimentId]?.trim() ??
      legacyColor ??
      schemeStyle.color;

    const effectiveColor =
      colorMode === "fixed" ? fixedColor : schemeStyle.color;

    const inheritedExperimentStyle =
      referenceTrace != null
        ? resolvePlotViewerTraceStyle({
            traceKey: referenceTrace.traceKey,
            descriptors: referenceTrace.descriptors,
            experimentId,
            colorBy: params.colorBy,
            lineStyleBy: params.lineStyleBy,
            markerBy: params.markerBy,
            styleContext,
            paletteId: params.paletteId,
            isDark: params.isDark,
            experimentColorMode: params.experimentColorMode,
            experimentFixedColor: params.experimentFixedColor,
            colorOverrides: params.colorOverrides,
            lineDashOverrides: params.lineDashOverrides,
            markerOverrides: params.markerOverrides,
            traceOverrides: {},
          })
        : {
            lineDash: "solid" as const,
            markerSymbol: "circle" as const,
            lineWidth: PLOT_VIEWER_DEFAULT_LINE_WIDTH,
            markerSize: PLOT_VIEWER_DEFAULT_MARKER_SIZE,
            markerEvery: undefined,
          };

    const effectiveExperimentStyle =
      referenceTrace != null
        ? resolvePlotViewerTraceStyle({
            traceKey: referenceTrace.traceKey,
            descriptors: referenceTrace.descriptors,
            experimentId,
            colorBy: params.colorBy,
            lineStyleBy: params.lineStyleBy,
            markerBy: params.markerBy,
            styleContext,
            paletteId: params.paletteId,
            isDark: params.isDark,
            experimentColorMode: params.experimentColorMode,
            experimentFixedColor: params.experimentFixedColor,
            colorOverrides: params.colorOverrides,
            lineDashOverrides: params.lineDashOverrides,
            markerOverrides: params.markerOverrides,
            experimentLineDashOverrides: params.experimentLineDashOverrides,
            experimentLineWidthOverrides: params.experimentLineWidthOverrides,
            experimentMarkerOverrides: params.experimentMarkerOverrides,
            experimentMarkerSizeOverrides: params.experimentMarkerSizeOverrides,
            experimentMarkerEveryOverrides: params.experimentMarkerEveryOverrides,
            traceOverrides: {},
          })
        : {
            lineDash: "solid" as const,
            markerSymbol: "circle" as const,
            lineWidth: PLOT_VIEWER_DEFAULT_LINE_WIDTH,
            markerSize: PLOT_VIEWER_DEFAULT_MARKER_SIZE,
            markerEvery: undefined,
          };

    const traceItems: PlotViewerTraceStyleListItem[] = experimentTraces.map(
      (trace) => {
        const inherited = resolvePlotViewerTraceStyle({
          traceKey: trace.traceKey,
          descriptors: trace.descriptors,
          experimentId,
          colorBy: params.colorBy,
          lineStyleBy: params.lineStyleBy,
          markerBy: params.markerBy,
          styleContext,
          paletteId: params.paletteId,
          isDark: params.isDark,
          experimentColorMode: params.experimentColorMode,
          experimentFixedColor: params.experimentFixedColor,
          colorOverrides: params.colorOverrides,
          lineDashOverrides: params.lineDashOverrides,
          markerOverrides: params.markerOverrides,
          experimentLineDashOverrides: params.experimentLineDashOverrides,
          experimentLineWidthOverrides: params.experimentLineWidthOverrides,
          experimentMarkerOverrides: params.experimentMarkerOverrides,
          experimentMarkerSizeOverrides: params.experimentMarkerSizeOverrides,
          experimentMarkerEveryOverrides: params.experimentMarkerEveryOverrides,
          traceOverrides: {},
        });
        const effective = resolvePlotViewerTraceStyle({
          traceKey: trace.traceKey,
          descriptors: trace.descriptors,
          experimentId,
          colorBy: params.colorBy,
          lineStyleBy: params.lineStyleBy,
          markerBy: params.markerBy,
          styleContext,
          paletteId: params.paletteId,
          isDark: params.isDark,
          experimentColorMode: params.experimentColorMode,
          experimentFixedColor: params.experimentFixedColor,
          colorOverrides: params.colorOverrides,
          lineDashOverrides: params.lineDashOverrides,
          markerOverrides: params.markerOverrides,
          experimentLineDashOverrides: params.experimentLineDashOverrides,
          experimentLineWidthOverrides: params.experimentLineWidthOverrides,
          experimentMarkerOverrides: params.experimentMarkerOverrides,
          experimentMarkerSizeOverrides: params.experimentMarkerSizeOverrides,
          experimentMarkerEveryOverrides: params.experimentMarkerEveryOverrides,
          traceOverrides: params.traceOverrides,
        });
        const flags = styleOverrideFlags(trace.traceKey, params.traceOverrides);
        return {
          traceKey: trace.traceKey,
          label: compactTraceLabel(trace),
          inheritedColor: inherited.color,
          inheritedLineDash: inherited.lineDash,
          inheritedMarker: inherited.markerSymbol,
          inheritedLineWidth: inherited.lineWidth,
          inheritedMarkerSize: inherited.markerSize,
          inheritedMarkerEvery: inherited.markerEvery,
          effectiveColor: effective.color,
          effectiveLineDash: effective.lineDash,
          effectiveMarker: effective.markerSymbol,
          effectiveLineWidth: effective.lineWidth,
          effectiveMarkerEvery: effective.markerEvery,
          effectiveMarkerSize: effective.markerSize,
          ...flags,
        };
      },
    );

    return {
      experimentId,
      label,
      colorMode,
      schemeColor: schemeStyle.color,
      fixedColor,
      effectiveColor,
      inheritedLineDash: inheritedExperimentStyle.lineDash,
      inheritedMarker: inheritedExperimentStyle.markerSymbol,
      inheritedLineWidth: inheritedExperimentStyle.lineWidth,
      inheritedMarkerSize: inheritedExperimentStyle.markerSize,
      effectiveLineDash: effectiveExperimentStyle.lineDash,
      effectiveMarker: effectiveExperimentStyle.markerSymbol,
      effectiveLineWidth: effectiveExperimentStyle.lineWidth,
      effectiveMarkerEvery: effectiveExperimentStyle.markerEvery,
      effectiveMarkerSize: effectiveExperimentStyle.markerSize,
      hasLineDashOverride: Boolean(
        params.experimentLineDashOverrides?.[experimentId],
      ),
      hasLineWidthOverride: Boolean(
        params.experimentLineWidthOverrides?.[experimentId],
      ),
      hasMarkerOverride: Boolean(
        params.experimentMarkerOverrides?.[experimentId],
      ),
      hasMarkerEveryOverride: Boolean(
        params.experimentMarkerEveryOverrides?.[experimentId],
      ),
      hasMarkerSizeOverride: Boolean(
        params.experimentMarkerSizeOverrides?.[experimentId],
      ),
      traces: traceItems,
    };
  });
}
