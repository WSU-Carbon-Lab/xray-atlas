"use client";

import { memo, type ReactNode } from "react";
import type { CursorMode } from "./ModeBar";
import { PlotToolRailsDeck } from "../toolbars/PlotToolRailsDeck";

type PlotToolRailProps = {
  plotWidth: number;
  plotHeight: number;
  currentMode: CursorMode;
  isCursorDisabled: boolean;
  isPanDisabled: boolean;
  onCursorModeChange: (mode: CursorMode) => void;
  onResetZoom: () => void;
  onExportClick?: () => void;
  dataViewTabs: ReactNode;
  analysisTools?: ReactNode;
};

export const PlotToolRail = memo(function PlotToolRail({
  plotWidth,
  plotHeight,
  currentMode,
  isCursorDisabled,
  isPanDisabled,
  onCursorModeChange,
  onResetZoom,
  onExportClick,
  dataViewTabs,
  analysisTools,
}: PlotToolRailProps) {
  return (
    <PlotToolRailsDeck
      plotWidth={plotWidth}
      plotHeight={plotHeight}
      currentMode={currentMode}
      isCursorDisabled={isCursorDisabled}
      isPanDisabled={isPanDisabled}
      onCursorModeChange={onCursorModeChange}
      onResetZoom={onResetZoom}
      onExportClick={onExportClick}
      displayTools={dataViewTabs}
      analysisTools={analysisTools}
    />
  );
});
