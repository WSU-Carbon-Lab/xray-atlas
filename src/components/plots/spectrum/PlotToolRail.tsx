"use client";

import { memo, type ReactNode } from "react";
import type { CursorMode } from "./ModeBar";
import {
  PlotToolRailsDeck,
  type PlotToolRailInsets,
} from "../toolbars/PlotToolRailsDeck";

type PlotToolRailProps = {
  plotWidth: number;
  plotHeight: number;
  railInsets?: PlotToolRailInsets;
  currentMode: CursorMode;
  isCursorDisabled: boolean;
  isPanDisabled: boolean;
  onCursorModeChange: (mode: CursorMode) => void;
  onResetZoom: () => void;
  onExportClick?: () => void;
  topRailLeadingExtras?: ReactNode;
  topRailTrailingExtras?: ReactNode;
  dataViewTabs: ReactNode;
  analysisTools?: ReactNode;
  bottomTools?: ReactNode;
  suppressAnalysisRailLeadingGrip?: boolean;
};

export const PlotToolRail = memo(function PlotToolRail({
  plotWidth,
  plotHeight,
  railInsets,
  currentMode,
  isCursorDisabled,
  isPanDisabled,
  onCursorModeChange,
  onResetZoom,
  onExportClick,
  topRailLeadingExtras,
  topRailTrailingExtras,
  dataViewTabs,
  analysisTools,
  bottomTools,
  suppressAnalysisRailLeadingGrip,
}: PlotToolRailProps) {
  return (
    <PlotToolRailsDeck
      plotWidth={plotWidth}
      plotHeight={plotHeight}
      railInsets={railInsets}
      currentMode={currentMode}
      isCursorDisabled={isCursorDisabled}
      isPanDisabled={isPanDisabled}
      onCursorModeChange={onCursorModeChange}
      onResetZoom={onResetZoom}
      onExportClick={onExportClick}
      topRailLeadingExtras={topRailLeadingExtras}
      topRailTrailingExtras={topRailTrailingExtras}
      displayTools={dataViewTabs}
      analysisTools={analysisTools}
      bottomTools={bottomTools}
      suppressAnalysisRailLeadingGrip={suppressAnalysisRailLeadingGrip}
    />
  );
});
