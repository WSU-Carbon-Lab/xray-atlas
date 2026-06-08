"use client";

import { useMemo } from "react";
import {
  isPlotViewerTraceHidden,
  plotViewerHiddenTraceIdSet,
} from "./plot-viewer-hidden-traces";
import type { PlotViewerDescriptorField, PlotViewerLegendRow } from "./plot-viewer-legend";
import {
  DEFAULT_PLOT_VIEWER_DESCRIPTOR_FIELDS,
  plotViewerDescriptorColumnTitle,
  plotViewerLegendGeometryKeys,
  resolvePlotViewerLegendDescriptorFields,
} from "./plot-viewer-legend";
import { PlotViewerLegendSwatch } from "./plot-viewer-legend-swatch";

export type PlotViewerCompactLegendProps = {
  rows: readonly PlotViewerLegendRow[];
  descriptorFields: readonly PlotViewerDescriptorField[];
  channelColumnTitle?: string;
  hiddenTraceIds?: readonly string[];
  onToggleTrace?: (traceKey: string) => void;
  legendTitleId?: string;
  /** When true, omits outer panel chrome for embedding inside pop-out tray shells. */
  embedded?: boolean;
};

/**
 * Compact N-column trace legend for pop-out and mobile panel placement.
 */
export function PlotViewerCompactLegend({
  rows,
  descriptorFields,
  channelColumnTitle = "Ch",
  hiddenTraceIds = [],
  onToggleTrace,
  legendTitleId = "plot-viewer-legend-title",
  embedded = false,
}: PlotViewerCompactLegendProps) {
  if (rows.length === 0) {
    return null;
  }

  const hiddenTraceLookup = useMemo(
    () => plotViewerHiddenTraceIdSet(hiddenTraceIds),
    [hiddenTraceIds],
  );
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
      aria-labelledby={embedded ? undefined : legendTitleId}
      className={
        embedded
          ? "shrink-0 overflow-x-auto px-2 py-1"
          : "border-border bg-surface/80 shrink-0 overflow-x-auto rounded-lg border px-3 py-2"
      }
    >
      {embedded ? null : (
        <p
          id={legendTitleId}
          className="text-foreground mb-1.5 text-[11px] font-semibold tracking-wide uppercase"
        >
          Traces
        </p>
      )}
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
          {rows.map((row) => {
            const hidden = isPlotViewerTraceHidden(
              hiddenTraceLookup,
              row.traceKey,
            );
            const visible = !hidden;
            const toggleHint = visible
              ? `Hide trace ${row.traceKey}`
              : `Show trace ${row.traceKey}`;
            const rowClassName = visible
              ? "text-foreground"
              : "text-foreground opacity-55";
            return (
              <tr key={row.traceKey} className={rowClassName}>
                <td className="py-1 pe-3 whitespace-nowrap">
                  <button
                    type="button"
                    className="inline-flex min-w-0 cursor-pointer items-center border-none bg-transparent p-0 text-left"
                    title={toggleHint}
                    aria-label={toggleHint}
                    aria-pressed={visible}
                    onClick={() => onToggleTrace?.(row.traceKey)}
                    disabled={onToggleTrace == null}
                  >
                    <PlotViewerLegendSwatch swatch={row.swatch} />
                  </button>
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
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
