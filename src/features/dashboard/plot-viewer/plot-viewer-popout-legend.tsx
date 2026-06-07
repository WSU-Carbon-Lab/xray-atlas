"use client";

import { Button } from "@heroui/react";
import { cn } from "@heroui/styles";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ListTree,
} from "lucide-react";
import { PlotToolbarRichHint } from "~/components/plots/toolbars";
import { PlotViewerCompactLegend } from "./plot-viewer-compact-legend";
import { PlotViewerLegendDockPicker } from "./plot-viewer-legend-placement";
import type { PlotViewerDescriptorField, PlotViewerLegendRow } from "./plot-viewer-legend";
import {
  plotViewerPopoutLegendAsideClassName,
  plotViewerPopoutLegendDockIsHorizontal,
  plotViewerPopoutLegendTrayChevronDirection,
  type PlotViewerPopoutLegendChevronDirection,
} from "./plot-viewer-popout-legend-layout";
import type { PlotViewerLegendDock } from "./plot-viewer-url-state";

export type PlotViewerPopoutLegendProps = {
  rows: readonly PlotViewerLegendRow[];
  descriptorFields: readonly PlotViewerDescriptorField[];
  channelColumnTitle: string;
  dock: PlotViewerLegendDock;
  trayOpen: boolean;
  onTrayOpenChange: (open: boolean) => void;
  onLegendDockChange: (dock: PlotViewerLegendDock) => void;
  hiddenTraceIds: readonly string[];
  onToggleTrace: (traceKey: string) => void;
};

function PlotViewerPopoutLegendChevron({
  direction,
  className,
}: {
  direction: PlotViewerPopoutLegendChevronDirection;
  className?: string;
}) {
  const props = { className: cn("h-3.5 w-3.5 shrink-0", className), "aria-hidden": true as const };
  switch (direction) {
    case "up":
      return <ChevronUp {...props} />;
    case "down":
      return <ChevronDown {...props} />;
    case "left":
      return <ChevronLeft {...props} />;
    case "right":
      return <ChevronRight {...props} />;
  }
}

/**
 * Docked trace legend panel around the plot canvas when legend placement is pop-out.
 * Collapses to a minimal edge strip; expanded state includes dock placement controls.
 */
export function PlotViewerPopoutLegend({
  rows,
  descriptorFields,
  channelColumnTitle,
  dock,
  trayOpen,
  onTrayOpenChange,
  onLegendDockChange,
  hiddenTraceIds,
  onToggleTrace,
}: PlotViewerPopoutLegendProps) {
  if (rows.length === 0) {
    return null;
  }

  const horizontalDock = plotViewerPopoutLegendDockIsHorizontal(dock);
  const chevronDirection = plotViewerPopoutLegendTrayChevronDirection(
    dock,
    trayOpen,
  );
  const trayToggleLabel = trayOpen ? "Collapse legend tray" : "Expand legend tray";

  if (!trayOpen) {
    return (
      <aside
        className={plotViewerPopoutLegendAsideClassName(dock, false)}
        aria-label="Trace legend panel"
      >
        <Button
          variant="ghost"
          size="sm"
          aria-label={trayToggleLabel}
          onPress={() => onTrayOpenChange(true)}
          className={cn(
            "text-muted hover:text-foreground h-full min-h-0 w-full min-w-0 gap-1 rounded-lg px-0 py-1",
            horizontalDock ? "flex-row" : "flex-col",
          )}
        >
          <ListTree className="h-3.5 w-3.5 shrink-0" aria-hidden />
          <span
            className={cn(
              "text-[10px] font-semibold tracking-wide uppercase",
              horizontalDock
                ? "truncate"
                : "[writing-mode:vertical-rl] rotate-180",
            )}
          >
            Legend
          </span>
          <PlotViewerPopoutLegendChevron direction={chevronDirection} />
        </Button>
      </aside>
    );
  }

  return (
    <aside
      className={cn(
        plotViewerPopoutLegendAsideClassName(dock, true),
        "h-full min-h-0",
      )}
      aria-label="Trace legend panel"
    >
      <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <div className="border-border flex shrink-0 items-center justify-between gap-1 border-b px-1 py-0.5">
          <PlotViewerLegendDockPicker
            legendDock={dock}
            onLegendDockChange={onLegendDockChange}
          />
          <PlotToolbarRichHint
            title="Collapse legend tray"
            description="Hide the legend panel and show a compact strip on the plot edge."
            placement="bottom"
          >
            <Button
              variant="ghost"
              size="sm"
              isIconOnly
              aria-label="Collapse legend tray"
              onPress={() => onTrayOpenChange(false)}
              className="text-muted hover:text-foreground min-w-7"
            >
              <PlotViewerPopoutLegendChevron direction={chevronDirection} />
            </Button>
          </PlotToolbarRichHint>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain p-1">
          <PlotViewerCompactLegend
            rows={rows}
            descriptorFields={descriptorFields}
            channelColumnTitle={channelColumnTitle}
            hiddenTraceIds={hiddenTraceIds}
            onToggleTrace={onToggleTrace}
            embedded
          />
        </div>
      </div>
    </aside>
  );
}
