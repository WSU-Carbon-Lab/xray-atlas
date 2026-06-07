import type { DescriptorTraceLegendConfig } from "~/components/plots/types";
import type { PlotViewerDescriptorField, PlotViewerLegendRow } from "./plot-viewer-legend";
import {
  DEFAULT_PLOT_VIEWER_DESCRIPTOR_FIELDS,
  plotViewerDescriptorColumnTitle,
  plotViewerLegendGeometryKeys,
  resolvePlotViewerLegendDescriptorFields,
} from "./plot-viewer-legend";

/**
 * Maps plot-viewer legend rows into {@link DescriptorTraceLegendConfig} for `SpectrumPlot`.
 */
export function mapPlotViewerLegendToDescriptorConfig(params: {
  rows: readonly PlotViewerLegendRow[];
  descriptorFields: readonly PlotViewerDescriptorField[];
  channelColumnTitle: string;
  hiddenTraceIds: readonly string[];
  onToggleTrace: (traceKey: string) => void;
}): DescriptorTraceLegendConfig {
  const geometryKeys = plotViewerLegendGeometryKeys(params.rows);
  const activeFields = resolvePlotViewerLegendDescriptorFields(
    params.descriptorFields.length > 0
      ? params.descriptorFields
      : DEFAULT_PLOT_VIEWER_DESCRIPTOR_FIELDS,
    geometryKeys,
  );

  return {
    channelColumnTitle: params.channelColumnTitle,
    hiddenTraceIds: params.hiddenTraceIds,
    onToggleTrace: params.onToggleTrace,
    columns: activeFields.map((field) => ({
      id: field,
      title: plotViewerDescriptorColumnTitle(field, { geometryKeys }),
    })),
    rows: params.rows.map((row) => ({
      traceKey: row.traceKey,
      channelLabel: row.channelLabel,
      swatch: {
        color: row.swatch.color,
        lineDash: row.swatch.lineDash,
        markerSymbol: row.swatch.markerSymbol,
      },
      cells: Object.fromEntries(
        activeFields.map((field) => [field, row.values[field] ?? "—"]),
      ),
    })),
  };
}
