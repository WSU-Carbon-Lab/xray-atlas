"use client";

import type { ReactNode } from "react";
import {
  TableCellsIcon,
  ChartBarIcon,
  PencilSquareIcon,
  FolderIcon,
} from "@heroicons/react/24/outline";
import { ChartLine, ChartArea, ChartScatter } from "lucide-react";
import { Tooltip } from "@heroui/react";
import { plotToolbarTooltipContentClass } from "~/components/plots/toolbars";

export type VisualizationMode = "graph" | "table" | "aux";
export type GraphStyle = "line" | "scatter" | "area";

const inactiveButtonClass =
  "border-border bg-surface text-foreground flex h-8 items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-default";
const activeButtonClass =
  "border-accent bg-accent text-accent-foreground flex h-8 items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors";

const DEFAULT_VISUALIZATION_MODES: VisualizationMode[] = ["graph", "table", "aux"];

interface VisualizationToggleProps {
  /** Subset of view modes to render; defaults to graph, table, and auxiliary files. */
  modes?: VisualizationMode[];
  mode: VisualizationMode;
  graphStyle?: GraphStyle;
  onModeChange: (mode: VisualizationMode) => void;
  onGraphStyleChange?: (style: GraphStyle) => void;
  showGraphStyles?: boolean;
  showEditButton?: boolean;
  editMode?: boolean;
  onEditModeChange?: (value: boolean) => void;
  /**
   * Renders in the right-aligned cluster with graph-style toggles (for example CSV actions).
   */
  trailingSlot?: ReactNode;
}

export function VisualizationToggle({
  modes = DEFAULT_VISUALIZATION_MODES,
  mode,
  graphStyle = "line",
  onModeChange,
  onGraphStyleChange,
  showGraphStyles = true,
  showEditButton = false,
  editMode = false,
  onEditModeChange,
  trailingSlot,
}: VisualizationToggleProps) {
  const graphStyles: GraphStyle[] = ["line", "scatter", "area"];

  const getStyleIcon = (style: GraphStyle) => {
    switch (style) {
      case "line":
        return <ChartLine className="h-4 w-4" />;
      case "scatter":
        return <ChartScatter className="h-4 w-4" />;
      case "area":
        return <ChartArea className="h-4 w-4" />;
    }
  };

  const showGraph = modes.includes("graph");
  const showTable = modes.includes("table");
  const showAux = modes.includes("aux");

  return (
    <div className="flex w-full min-w-0 flex-wrap items-center gap-x-2 gap-y-2">
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        {showGraph ? (
          <Tooltip delay={0}>
            <button
              type="button"
              onClick={() => onModeChange("graph")}
              className={
                mode === "graph" ? activeButtonClass : inactiveButtonClass
              }
            >
              <ChartBarIcon className="h-4 w-4" />
              <span>Graph</span>
            </button>
            <Tooltip.Content className={plotToolbarTooltipContentClass}>
              Show graph: Open the interactive spectrum plot.
            </Tooltip.Content>
          </Tooltip>
        ) : null}
        {showTable ? (
          <Tooltip delay={0}>
            <button
              type="button"
              onClick={() => onModeChange("table")}
              className={
                mode === "table" ? activeButtonClass : inactiveButtonClass
              }
            >
              <TableCellsIcon className="h-4 w-4" />
              <span>Table</span>
            </button>
            <Tooltip.Content className={plotToolbarTooltipContentClass}>
              Show table: View every point in a sortable grid.
            </Tooltip.Content>
          </Tooltip>
        ) : null}
        {showAux ? (
          <Tooltip delay={0}>
            <button
              type="button"
              onClick={() => onModeChange("aux")}
              className={mode === "aux" ? activeButtonClass : inactiveButtonClass}
            >
              <FolderIcon className="h-4 w-4" />
              <span>Auxiliary files</span>
            </button>
            <Tooltip.Content className={plotToolbarTooltipContentClass}>
              Auxiliary files: Browse experiment and sample attachments and upload
              supporting data.
            </Tooltip.Content>
          </Tooltip>
        ) : null}
      </div>

      <div className="ml-auto flex min-w-0 flex-wrap items-center justify-end gap-2">
        {mode === "graph" && showGraphStyles && onGraphStyleChange ? (
          <div className="flex flex-wrap items-center justify-end gap-2">
            {graphStyles.map((style) => (
              <Tooltip key={style} delay={0}>
                <button
                  type="button"
                  onClick={() => onGraphStyleChange(style)}
                  className={
                    graphStyle === style ? activeButtonClass : inactiveButtonClass
                  }
                >
                  {getStyleIcon(style)}
                  <span>
                    {style === "line" && "Line"}
                    {style === "scatter" && "Scatter"}
                    {style === "area" && "Area"}
                  </span>
                </button>
                <Tooltip.Content className={plotToolbarTooltipContentClass}>
                  {style === "line"
                    ? "Plot line: Draw the spectrum as connected segments."
                    : style === "scatter"
                      ? "Plot scatter: Draw one marker per sample."
                      : "Plot area: Fill the region under the spectrum curve."}
                </Tooltip.Content>
              </Tooltip>
            ))}
          </div>
        ) : null}

        {trailingSlot ? (
          <div className="flex flex-wrap items-center justify-end gap-2">
            {trailingSlot}
          </div>
        ) : null}

        {showEditButton && onEditModeChange ? (
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Tooltip delay={0}>
              <button
                type="button"
                onClick={() => onEditModeChange(!editMode)}
                className={editMode ? activeButtonClass : inactiveButtonClass}
              >
                <PencilSquareIcon className="h-4 w-4" />
                <span>Edit</span>
              </button>
              <Tooltip.Content className={plotToolbarTooltipContentClass}>
                {editMode
                  ? "Exit edit mode: Stop changing cells in the table."
                  : "Edit table: Change energy, mu, and angles in place."}
              </Tooltip.Content>
            </Tooltip>
          </div>
        ) : null}
      </div>
    </div>
  );
}
