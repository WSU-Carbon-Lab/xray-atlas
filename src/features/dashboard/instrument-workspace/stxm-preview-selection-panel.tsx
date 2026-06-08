"use client";

import { useMemo, useState } from "react";
import { Button } from "@heroui/react";
import { ChevronDown, ChevronRight } from "lucide-react";
import type {
  DashboardIngestionResult,
  DashboardPreviewAtlasEntry,
  DashboardPreviewRegionSpectrum,
  DashboardPreviewSpectrumEntry,
} from "~/lib/dashboard-processing-session";
import type { DashboardPlotDatasetInput } from "~/features/dashboard/plot-viewer/build-dashboard-plot-model";
import type { SpectrumPoint } from "~/components/plots/types";
import {
  PlotViewerCheckbox,
  PlotViewerCheckboxLabel,
} from "~/features/dashboard/plot-viewer/plot-viewer-checkbox";
import { PlotViewerPanelToggle } from "~/features/dashboard/plot-viewer/plot-viewer-panel-toggle";
import {
  defaultStxmPreviewTraceKeys,
  listStxmPreviewTraceCandidates,
} from "./stxm-preview-styled-traces";
import { StxmPreviewAtlasSection } from "./stxm-preview-atlas-section";

export type StxmPreviewSelectionPanelProps = {
  entries: readonly DashboardPreviewSpectrumEntry[];
  atlasEntries: readonly DashboardPreviewAtlasEntry[];
  ingestionByScanId: Readonly<
    Record<string, DashboardIngestionResult | undefined>
  >;
  regionSpectraByScanId: Readonly<
    Record<string, readonly DashboardPreviewRegionSpectrum[] | undefined>
  >;
  atlasDatasets: readonly DashboardPlotDatasetInput[];
  atlasGeometryByExperimentId: Readonly<
    Record<string, readonly string[] | undefined>
  >;
  spectraByExperimentId: ReadonlyMap<string, SpectrumPoint[]>;
  selectedTraceKeys: readonly string[];
  onSelectedTraceKeysChange: (traceKeys: string[]) => void;
  onAtlasEntriesChange: (entries: DashboardPreviewAtlasEntry[]) => void;
  onGeometryByExperimentIdChange: (
    geometryByExperimentId: Record<string, string[]>,
  ) => void;
  activeScanId: string | null;
  onSelectScan: (scanId: string) => void;
  onRemoveEntry: (scanId: string) => void;
  onRemoveAtlasEntry?: (experimentId: string) => void;
  panelOpen: boolean;
  atlasSpectraLoading?: boolean;
};

/**
 * Left selection rail for STXM preview compare: cached line scans with per-region trace toggles.
 */
export function StxmPreviewSelectionPanel({
  entries,
  atlasEntries,
  ingestionByScanId,
  regionSpectraByScanId,
  atlasDatasets,
  atlasGeometryByExperimentId,
  spectraByExperimentId,
  selectedTraceKeys,
  onSelectedTraceKeysChange,
  onAtlasEntriesChange,
  onGeometryByExperimentIdChange,
  activeScanId,
  onSelectScan,
  onRemoveEntry,
  onRemoveAtlasEntry,
  panelOpen,
  atlasSpectraLoading = false,
}: StxmPreviewSelectionPanelProps) {
  const [expandedScanIds, setExpandedScanIds] = useState<Set<string>>(
    () => new Set(entries.map((entry) => entry.scanId)),
  );

  const candidates = useMemo(
    () =>
      listStxmPreviewTraceCandidates({
        entries,
        ingestionByScanId,
        regionSpectraByScanId,
      }),
    [entries, ingestionByScanId, regionSpectraByScanId],
  );

  const totalTraceCount =
    candidates.length +
    atlasEntries.reduce(
      (count, entry) =>
        count + (atlasGeometryByExperimentId[entry.experimentId]?.length ?? 0),
      0,
    );

  const candidatesByScanId = useMemo(() => {
    const map = new Map<string, typeof candidates>();
    for (const candidate of candidates) {
      const list = map.get(candidate.scanId) ?? [];
      list.push(candidate);
      map.set(candidate.scanId, list);
    }
    return map;
  }, [candidates]);

  const selectedSet = useMemo(
    () => new Set(selectedTraceKeys),
    [selectedTraceKeys],
  );

  const toggleTrace = (traceKey: string) => {
    if (selectedSet.has(traceKey)) {
      onSelectedTraceKeysChange(
        selectedTraceKeys.filter((key) => key !== traceKey),
      );
      return;
    }
    onSelectedTraceKeysChange([...selectedTraceKeys, traceKey]);
  };

  const toggleScanTraces = (scanId: string, selected: boolean) => {
    const scanTraceKeys =
      candidatesByScanId.get(scanId)?.map((row) => row.traceKey) ?? [];
    if (selected) {
      const merged = new Set([...selectedTraceKeys, ...scanTraceKeys]);
      onSelectedTraceKeysChange([...merged]);
      return;
    }
    const scanKeySet = new Set(scanTraceKeys);
    onSelectedTraceKeysChange(
      selectedTraceKeys.filter((key) => !scanKeySet.has(key)),
    );
  };

  const toggleExpanded = (scanId: string) => {
    setExpandedScanIds((current) => {
      const next = new Set(current);
      if (next.has(scanId)) {
        next.delete(scanId);
      } else {
        next.add(scanId);
      }
      return next;
    });
  };

  if (!panelOpen) {
    return null;
  }

  return (
    <aside className="border-border bg-surface relative z-30 flex w-[min(100%,20rem)] shrink-0 flex-col overflow-hidden rounded-lg border">
      <div className="border-border border-b px-3 py-2.5">
        <p className="text-foreground text-sm font-medium">Cached scans</p>
        <p className="text-muted text-xs">
          {entries.length} local · {atlasEntries.length} Atlas ·{" "}
          {selectedTraceKeys.length} trace
          {selectedTraceKeys.length === 1 ? "" : "s"} selected
          {atlasSpectraLoading ? " · loading Atlas..." : ""}
        </p>
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-2">
        {entries.map((entry) => {
          const scanCandidates = candidatesByScanId.get(entry.scanId) ?? [];
          const scanTraceKeys = scanCandidates.map((row) => row.traceKey);
          const selectedCount = scanTraceKeys.filter((key) =>
            selectedSet.has(key),
          ).length;
          const allSelected =
            scanTraceKeys.length > 0 && selectedCount === scanTraceKeys.length;
          const isExpanded = expandedScanIds.has(entry.scanId);
          const ingestion = ingestionByScanId[entry.scanId];
          const pointCount = ingestion?.energyEv.length ?? 0;
          return (
            <div
              key={entry.scanId}
              className="border-border rounded-md border"
            >
              <div className="flex items-start gap-1 px-2 py-2">
                <button
                  type="button"
                  className="text-muted hover:text-foreground mt-0.5 shrink-0 rounded p-0.5"
                  aria-label={
                    isExpanded ? "Collapse scan regions" : "Expand scan regions"
                  }
                  onClick={() => toggleExpanded(entry.scanId)}
                >
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4" aria-hidden />
                  ) : (
                    <ChevronRight className="h-4 w-4" aria-hidden />
                  )}
                </button>
                <PlotViewerCheckbox
                  isSelected={allSelected}
                  onChange={() => toggleScanTraces(entry.scanId, !allSelected)}
                  contentClassName="min-w-0 flex-1"
                >
                  <div className="min-w-0">
                    <PlotViewerCheckboxLabel className="text-foreground font-medium">
                      {entry.scanLabel}
                    </PlotViewerCheckboxLabel>
                    <p className="text-muted text-xs">
                      {entry.edgeLabel ?? "Edge unknown"}
                      {pointCount > 0
                        ? ` · ${pointCount} pts`
                        : " · not reduced"}
                      {scanCandidates.length > 0
                        ? ` · ${selectedCount}/${scanCandidates.length} traces`
                        : ""}
                    </p>
                  </div>
                </PlotViewerCheckbox>
              </div>
              {isExpanded ? (
                <ul className="border-border space-y-1 border-t px-2 py-2">
                  {scanCandidates.map((candidate) => (
                    <li key={candidate.traceKey}>
                      <PlotViewerCheckbox
                        isSelected={selectedSet.has(candidate.traceKey)}
                        onChange={() => toggleTrace(candidate.traceKey)}
                        className="pl-5"
                      >
                        <PlotViewerCheckboxLabel>
                          {candidate.regionLabel}
                        </PlotViewerCheckboxLabel>
                      </PlotViewerCheckbox>
                    </li>
                  ))}
                  {scanCandidates.length === 0 ? (
                    <li className="text-muted pl-5 text-xs">
                      No plottable traces. Re-process in Ingestion after
                      defining regions.
                    </li>
                  ) : null}
                </ul>
              ) : null}
              <div className="border-border flex flex-wrap gap-2 border-t px-2 py-2">
                <Button
                  size="sm"
                  variant={
                    entry.scanId === activeScanId ? "primary" : "secondary"
                  }
                  onPress={() => onSelectScan(entry.scanId)}
                >
                  Open in Ingestion
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="pointer-events-auto"
                  onPress={() => onRemoveEntry(entry.scanId)}
                >
                  Remove
                </Button>
              </div>
            </div>
          );
        })}
        <StxmPreviewAtlasSection
          atlasEntries={atlasEntries}
          selectedTraceKeys={selectedTraceKeys}
          spectraByExperimentId={spectraByExperimentId}
          onAtlasEntriesChange={onAtlasEntriesChange}
          onSelectedTraceKeysChange={onSelectedTraceKeysChange}
          onGeometryByExperimentIdChange={onGeometryByExperimentIdChange}
          geometryByExperimentId={atlasGeometryByExperimentId}
          onRemoveAtlasEntry={onRemoveAtlasEntry}
        />
      </div>
      <div className="border-border border-t px-3 py-2">
        <Button
          size="sm"
          variant="secondary"
          className="w-full"
          onPress={() =>
            onSelectedTraceKeysChange([
              ...defaultStxmPreviewTraceKeys(candidates),
              ...atlasDatasets.flatMap((dataset) => {
                const keys =
                  atlasGeometryByExperimentId[dataset.experimentId] ?? [];
                return keys.map((geometryKey) =>
                  `${dataset.experimentId}:${geometryKey}`,
                );
              }),
            ])
          }
        >
          Select all traces ({totalTraceCount})
        </Button>
      </div>
    </aside>
  );
}

export type StxmPreviewSelectionPanelHeaderProps = {
  panelOpen: boolean;
  onPanelOpenChange: (open: boolean) => void;
  traceCount: number;
  selectedTraceCount: number;
};

/**
 * Plot header row fragment with panel toggle and trace counts for preview compare.
 */
export function StxmPreviewSelectionPanelHeader({
  panelOpen,
  onPanelOpenChange,
  traceCount,
  selectedTraceCount,
}: StxmPreviewSelectionPanelHeaderProps) {
  return (
    <div className="flex min-w-0 items-start gap-2">
      <PlotViewerPanelToggle
        panelOpen={panelOpen}
        onPanelOpenChange={onPanelOpenChange}
      />
      <div>
        <p className="text-foreground text-sm font-medium">Compare spectra</p>
        <p className="text-muted text-xs">
          {selectedTraceCount} of {traceCount} trace
          {traceCount === 1 ? "" : "s"} visible
        </p>
      </div>
    </div>
  );
}
