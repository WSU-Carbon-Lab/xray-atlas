import type { PlotViewerLegendDock } from "./plot-viewer-url-state";

/** Width of the collapsed pop-out legend strip for left/right docks. */
export const PLOT_VIEWER_POPOUT_LEGEND_COLLAPSED_STRIP_WIDTH_CLASS = "w-8";

/** Height of the collapsed pop-out legend strip for top/bottom docks. */
export const PLOT_VIEWER_POPOUT_LEGEND_COLLAPSED_STRIP_HEIGHT_CLASS = "h-8";

/** Expanded width for left/right docked legend panels. */
export const PLOT_VIEWER_POPOUT_LEGEND_EXPANDED_WIDTH_CLASS =
  "w-[min(100%,16rem)]";

/** Expanded max height for top/bottom docked legend panels. */
export const PLOT_VIEWER_POPOUT_LEGEND_EXPANDED_MAX_HEIGHT_CLASS =
  "max-h-[min(40vh,20rem)]";

/** Side-docked expanded panels stretch to the plot column height. */
export const PLOT_VIEWER_POPOUT_LEGEND_SIDE_EXPANDED_HEIGHT_CLASS =
  "h-full min-h-0";

/**
 * Returns true when the pop-out legend dock attaches along the plot vertical axis.
 */
export function plotViewerPopoutLegendDockIsHorizontal(
  dock: PlotViewerLegendDock,
): boolean {
  return dock === "top" || dock === "bottom";
}

/**
 * Applies border radius and plot-adjacent edge trimming so the legend panel sits
 * flush against the plot with a minimal shared seam.
 */
export function plotViewerPopoutLegendPlotAdjacentChromeClassName(
  dock: PlotViewerLegendDock,
): string {
  switch (dock) {
    case "top":
      return "rounded-t-lg rounded-b-none border-b-0";
    case "bottom":
      return "rounded-b-lg rounded-t-none border-t-0";
    case "left":
      return "rounded-s-lg rounded-e-none border-e-0";
    case "right":
      return "rounded-e-lg rounded-s-none border-s-0";
  }
}

/**
 * Builds Tailwind classes for the pop-out legend aside shell for the given dock
 * and tray expansion state.
 */
export function plotViewerPopoutLegendAsideClassName(
  dock: PlotViewerLegendDock,
  trayOpen: boolean,
): string {
  const base =
    "border-border bg-surface/95 hidden shrink-0 self-stretch border shadow-sm backdrop-blur-sm sm:flex";

  const plotAdjacent = plotViewerPopoutLegendPlotAdjacentChromeClassName(dock);

  if (plotViewerPopoutLegendDockIsHorizontal(dock)) {
    if (trayOpen) {
      return `${base} ${plotAdjacent} w-full flex-col ${PLOT_VIEWER_POPOUT_LEGEND_EXPANDED_MAX_HEIGHT_CLASS}`;
    }
    return `${base} ${plotAdjacent} w-full flex-row items-center justify-center ${PLOT_VIEWER_POPOUT_LEGEND_COLLAPSED_STRIP_HEIGHT_CLASS}`;
  }

  if (trayOpen) {
    return `${base} ${plotAdjacent} flex-col ${PLOT_VIEWER_POPOUT_LEGEND_EXPANDED_WIDTH_CLASS} ${PLOT_VIEWER_POPOUT_LEGEND_SIDE_EXPANDED_HEIGHT_CLASS}`;
  }
  return `${base} ${plotAdjacent} h-full min-h-0 flex-col items-center justify-center ${PLOT_VIEWER_POPOUT_LEGEND_COLLAPSED_STRIP_WIDTH_CLASS}`;
}

export type PlotViewerPopoutLegendChevronDirection =
  | "up"
  | "down"
  | "left"
  | "right";

/**
 * Resolves the chevron direction for expanding or collapsing the pop-out legend
 * tray relative to the plot edge.
 */
export function plotViewerPopoutLegendTrayChevronDirection(
  dock: PlotViewerLegendDock,
  trayOpen: boolean,
): PlotViewerPopoutLegendChevronDirection {
  if (trayOpen) {
    switch (dock) {
      case "top":
        return "up";
      case "bottom":
        return "down";
      case "left":
        return "left";
      case "right":
        return "right";
    }
  }

  switch (dock) {
    case "top":
      return "down";
    case "bottom":
      return "up";
    case "left":
      return "right";
    case "right":
      return "left";
  }
}
