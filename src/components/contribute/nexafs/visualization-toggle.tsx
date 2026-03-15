"use client";

import { TableCellsIcon, ChartBarIcon, PencilSquareIcon } from "@heroicons/react/24/outline";
import { ChartLine, ChartArea, ChartScatter } from "lucide-react";
import { Tooltip } from "@heroui/react";

export type VisualizationMode = "graph" | "table";
export type GraphStyle = "line" | "scatter" | "area";

const tooltipContentClass = "bg-foreground text-background rounded-lg px-3 py-2 shadow-lg";

const inactiveButtonClass =
  "border-border bg-surface text-foreground flex h-8 items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-default";
const activeButtonClass =
  "border-accent bg-accent text-accent-foreground flex h-8 items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors";

interface VisualizationToggleProps {
  mode: VisualizationMode;
  graphStyle?: GraphStyle;
  onModeChange: (mode: VisualizationMode) => void;
  onGraphStyleChange?: (style: GraphStyle) => void;
  showGraphStyles?: boolean;
  showEditButton?: boolean;
  editMode?: boolean;
  onEditModeChange?: (value: boolean) => void;
}

export function VisualizationToggle({
  mode,
  graphStyle = "line",
  onModeChange,
  onGraphStyleChange,
  showGraphStyles = true,
  showEditButton = false,
  editMode = false,
  onEditModeChange,
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

  return (
    <div className="flex w-full items-center justify-between gap-2">
      <div className="flex items-center gap-2">
        <Tooltip delay={0}>
          <button
            type="button"
            onClick={() => onModeChange("graph")}
            className={mode === "graph" ? activeButtonClass : inactiveButtonClass}
          >
            <ChartBarIcon className="h-4 w-4" />
            <span>Graph</span>
          </button>
          <Tooltip.Content className={tooltipContentClass}>
            View spectrum data as an interactive graph
          </Tooltip.Content>
        </Tooltip>
        <Tooltip delay={0}>
          <button
            type="button"
            onClick={() => onModeChange("table")}
            className={mode === "table" ? activeButtonClass : inactiveButtonClass}
          >
            <TableCellsIcon className="h-4 w-4" />
            <span>Table</span>
          </button>
          <Tooltip.Content className={tooltipContentClass}>
            View spectrum data as a table with all data points
          </Tooltip.Content>
        </Tooltip>
      </div>

      {mode === "graph" && showGraphStyles && onGraphStyleChange && (
        <div className="flex items-center gap-2">
          {graphStyles.map((style) => (
            <Tooltip key={style} delay={0}>
              <button
                type="button"
                onClick={() => onGraphStyleChange(style)}
                className={graphStyle === style ? activeButtonClass : inactiveButtonClass}
              >
                {getStyleIcon(style)}
                <span>
                  {style === "line" && "Line"}
                  {style === "scatter" && "Scatter"}
                  {style === "area" && "Area"}
                </span>
              </button>
              <Tooltip.Content className={tooltipContentClass}>
                {style === "line"
                  ? "Display spectrum as a continuous line"
                  : style === "scatter"
                    ? "Display spectrum as individual data points"
                    : "Display spectrum as a filled area under the curve"}
              </Tooltip.Content>
            </Tooltip>
          ))}
        </div>
      )}
      {showEditButton && onEditModeChange && (
        <div className="flex items-center gap-2">
          <Tooltip delay={0}>
            <button
              type="button"
              onClick={() => onEditModeChange(!editMode)}
              className={editMode ? activeButtonClass : inactiveButtonClass}
            >
              <PencilSquareIcon className="h-4 w-4" />
              <span>Edit</span>
            </button>
            <Tooltip.Content className={tooltipContentClass}>
              {editMode ? "Exit edit mode" : "Edit values in the table"}
            </Tooltip.Content>
          </Tooltip>
        </div>
      )}
    </div>
  );
}
