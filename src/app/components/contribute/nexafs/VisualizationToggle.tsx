"use client";

import { DefaultButton as Button } from "~/app/components/Button";
import { TableCellsIcon, ChartBarIcon } from "@heroicons/react/24/outline";
import { ChartLine, ChartArea, ChartScatter } from "lucide-react";
import { Tooltip } from "@heroui/react";

export type VisualizationMode = "graph" | "table";
export type GraphStyle = "line" | "scatter" | "area";

interface VisualizationToggleProps {
  mode: VisualizationMode;
  graphStyle?: GraphStyle;
  onModeChange: (mode: VisualizationMode) => void;
  onGraphStyleChange?: (style: GraphStyle) => void;
  showGraphStyles?: boolean;
}

export function VisualizationToggle({
  mode,
  graphStyle = "line",
  onModeChange,
  onGraphStyleChange,
  showGraphStyles = true,
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
    <div className="flex items-center justify-between w-full gap-2">
      <div className="flex items-center gap-2">
        <Tooltip delay={0}>
          <Button
            type="button"
            variant={mode === "graph" ? "solid" : "bordered"}
            size="sm"
            onClick={() => onModeChange("graph")}
            className={`rounded-lg border-2 px-4 py-2 transition-all ${
              mode === "graph"
                ? "bg-blue-100 border-blue-300 text-blue-900 dark:bg-blue-900/30 dark:border-blue-700 dark:text-blue-200 shadow-sm"
                : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-700"
            }`}
          >
            <div className="flex items-center gap-1.5">
              <ChartBarIcon className="h-4 w-4" />
              <span className="text-sm font-medium">Graph</span>
            </div>
          </Button>
          <Tooltip.Content className="bg-gray-900 text-white dark:bg-gray-700 dark:text-gray-100 px-3 py-2 rounded-lg shadow-lg">
            View spectrum data as an interactive graph
          </Tooltip.Content>
        </Tooltip>
        <Tooltip delay={0}>
          <Button
            type="button"
            variant={mode === "table" ? "solid" : "bordered"}
            size="sm"
            onClick={() => onModeChange("table")}
            className={`rounded-lg border-2 px-4 py-2 transition-all ${
              mode === "table"
                ? "bg-purple-100 border-purple-300 text-purple-900 dark:bg-purple-900/30 dark:border-purple-700 dark:text-purple-200 shadow-sm"
                : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-700"
            }`}
          >
            <div className="flex items-center gap-1.5">
              <TableCellsIcon className="h-4 w-4" />
              <span className="text-sm font-medium">Table</span>
            </div>
          </Button>
          <Tooltip.Content className="bg-gray-900 text-white dark:bg-gray-700 dark:text-gray-100 px-3 py-2 rounded-lg shadow-lg">
            View spectrum data as a table with all data points
          </Tooltip.Content>
        </Tooltip>
      </div>

      {mode === "graph" && showGraphStyles && onGraphStyleChange && (
        <div className="flex items-center gap-2">
          {graphStyles.map((style) => (
            <Tooltip key={style} delay={0}>
              <Button
                type="button"
                variant={graphStyle === style ? "solid" : "bordered"}
                size="sm"
                onClick={() => onGraphStyleChange(style)}
                className={`rounded-lg border-2 px-3 py-1.5 text-xs transition-all ${
                  graphStyle === style
                    ? "bg-orange-100 border-orange-300 text-orange-900 dark:bg-orange-900/30 dark:border-orange-700 dark:text-orange-200 shadow-sm"
                    : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-700"
                }`}
              >
                <div className="flex items-center gap-1.5">
                  {getStyleIcon(style)}
                  <span>
                    {style === "line" && "Line"}
                    {style === "scatter" && "Scatter"}
                    {style === "area" && "Area"}
                  </span>
                </div>
              </Button>
              <Tooltip.Content className="bg-gray-900 text-white dark:bg-gray-700 dark:text-gray-100 px-3 py-2 rounded-lg shadow-lg">
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
    </div>
  );
}
