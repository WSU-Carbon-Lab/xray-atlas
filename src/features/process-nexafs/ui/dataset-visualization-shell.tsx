"use client";

import type { ReactNode } from "react";
import {
  VisualizationToggle,
  type GraphStyle,
  type VisualizationMode,
} from "./visualization-toggle";

export type { GraphStyle, VisualizationMode } from "./visualization-toggle";

export type DatasetVisualizationShellProps = {
  modes?: VisualizationMode[];
  mode: VisualizationMode;
  onModeChange: (mode: VisualizationMode) => void;
  graphStyle?: GraphStyle;
  onGraphStyleChange?: (style: GraphStyle) => void;
  showGraphStyles?: boolean;
  leadingSlot?: ReactNode;
  trailingSlot?: ReactNode;
  graph: ReactNode;
  table: ReactNode;
  aux?: ReactNode;
};

/**
 * Shared Graph / Table / Aux shell matching the NEXAFS experiment dataset panel header layout.
 */
export function DatasetVisualizationShell({
  modes,
  mode,
  onModeChange,
  graphStyle = "line",
  onGraphStyleChange,
  showGraphStyles = true,
  leadingSlot,
  trailingSlot,
  graph,
  table,
  aux,
}: DatasetVisualizationShellProps) {
  return (
    <div className="flex w-full min-w-0 flex-col gap-3">
      {leadingSlot ? (
        <div className="flex w-full min-w-0 flex-col gap-2">{leadingSlot}</div>
      ) : null}
      <VisualizationToggle
        modes={modes}
        mode={mode}
        graphStyle={graphStyle}
        onModeChange={onModeChange}
        onGraphStyleChange={onGraphStyleChange}
        showGraphStyles={showGraphStyles}
        trailingSlot={trailingSlot}
      />
      {mode === "aux" && aux != null
        ? aux
        : mode === "table"
          ? table
          : graph}
    </div>
  );
}
