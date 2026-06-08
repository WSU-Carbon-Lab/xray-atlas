"use client";

import type { PlotViewerDescriptorField, PlotViewerLegendRow } from "./plot-viewer-legend";
import {
  DEFAULT_PLOT_VIEWER_DESCRIPTOR_FIELDS,
  plotViewerDescriptorColumnTitle,
  plotViewerLegendGeometryKeys,
  resolvePlotViewerLegendDescriptorFields,
} from "./plot-viewer-legend";
import { PlotViewerLegendSwatch } from "./plot-viewer-legend-swatch";

export type PlotViewerLegendTableProps = {
  rows: readonly PlotViewerLegendRow[];
  descriptorFields: readonly PlotViewerDescriptorField[];
  channelColumnTitle: string;
  /** Short summary of active style encodings shown above the table. */
  encodingSummary?: string;
  /** DOM id for `aria-labelledby` on the legend region wrapper. */
  legendTitleId?: string;
};

/**
 * @deprecated Prefer {@link PlotViewerCompactLegend} (pop-out) or in-plot
 * {@link PlotSpectrumGeometryLegend} via `suppressInPlotLegend={false}`.
 * Dynamic N-column legend table rendered outside the plot canvas for wide compare views.
 */
export function PlotViewerLegendTable({
  rows,
  descriptorFields,
  channelColumnTitle,
  encodingSummary,
  legendTitleId = "plot-viewer-legend-title",
}: PlotViewerLegendTableProps) {
  if (rows.length === 0) {
    return null;
  }

  const geometryKeys = plotViewerLegendGeometryKeys(rows);
  const activeDescriptorFields = resolvePlotViewerLegendDescriptorFields(
    descriptorFields.length > 0
      ? descriptorFields
      : DEFAULT_PLOT_VIEWER_DESCRIPTOR_FIELDS,
    geometryKeys,
  );

  return (
    <div
      role="region"
      aria-labelledby={legendTitleId}
      className="border-border bg-surface/80 shrink-0 overflow-x-auto rounded-lg border px-3 py-2"
    >
      <p
        id={legendTitleId}
        className="text-foreground mb-1.5 text-[11px] font-semibold tracking-wide uppercase"
      >
        Legend
      </p>
      {encodingSummary ? (
        <p className="text-muted mb-1.5 text-[11px] leading-snug">{encodingSummary}</p>
      ) : null}
      <table className="w-full min-w-[240px] border-collapse text-xs">
        <thead>
          <tr className="text-muted border-border border-b">
            <th className="pb-1.5 pe-3 text-start font-medium whitespace-nowrap">
              {channelColumnTitle}
            </th>
            {activeDescriptorFields.map((field) => (
              <th
                key={field}
                className="pb-1.5 pe-3 text-start font-medium whitespace-nowrap last:pe-0"
              >
                {plotViewerDescriptorColumnTitle(field, { geometryKeys })}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.traceKey} className="text-foreground">
              <td className="py-1 pe-3 whitespace-nowrap">
                <PlotViewerLegendSwatch swatch={row.swatch} />
              </td>
              {activeDescriptorFields.map((field) => (
                <td
                  key={`${row.traceKey}:${field}`}
                  className="py-1 pe-3 min-w-0 max-w-[14rem] truncate whitespace-nowrap last:pe-0"
                >
                  {row.values[field] ?? "—"}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
