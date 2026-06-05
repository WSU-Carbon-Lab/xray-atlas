"use client";

import { PlotSpectrumToolsToolbarSection } from "~/components/plots/toolbars";

export type StxmIngestionAnalysisRailProps = {
  isNormalizationMode: boolean;
  onNormalizationModeChange: (enabled: boolean) => void;
  activeEdge: "pre" | "post";
  onActiveEdgeChange: (edge: "pre" | "post") => void;
  onResetNormalizationRegions: () => void;
  hasData: boolean;
  isPeakSetMode: boolean;
  onPeakSetModeChange: (enabled: boolean) => void;
  peakCount: number;
  onResetAllPeaks: () => void;
};

/**
 * STXM ingestion right analysis rail: normalization edge tools and peak assignment.
 */
export function StxmIngestionAnalysisRail({
  isNormalizationMode,
  onNormalizationModeChange,
  activeEdge,
  onActiveEdgeChange,
  onResetNormalizationRegions,
  hasData,
  isPeakSetMode,
  onPeakSetModeChange,
  peakCount,
  onResetAllPeaks,
}: StxmIngestionAnalysisRailProps) {
  return (
    <div className="pointer-events-auto flex flex-col items-stretch gap-1">
      <PlotSpectrumToolsToolbarSection
        isNormalizationMode={isNormalizationMode}
        onNormalizationModeChange={onNormalizationModeChange}
        activeEdge={activeEdge}
        onActiveEdgeChange={onActiveEdgeChange}
        onResetToDefaultRegions={onResetNormalizationRegions}
        normalizationLocked={false}
        hasData={hasData}
        isPeakSetMode={isPeakSetMode}
        onPeakSetModeChange={onPeakSetModeChange}
        peakCount={peakCount}
        onAutoDetectPeaks={() => {}}
        onResetAllPeaks={onResetAllPeaks}
      />
    </div>
  );
}
