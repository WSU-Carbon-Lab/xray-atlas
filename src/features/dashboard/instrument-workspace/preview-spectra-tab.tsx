"use client";

import { Button } from "@heroui/react";
import type {
  DashboardIngestionResult,
  DashboardPreviewSpectrumEntry,
} from "~/lib/dashboard-processing-session";

type PreviewSpectraTabProps = {
  entries: DashboardPreviewSpectrumEntry[];
  activeScanId: string | null;
  ingestionByScanId: Record<string, DashboardIngestionResult | undefined>;
  onSelectScan: (scanId: string) => void;
  onRemoveEntry: (scanId: string) => void;
};

/**
 * Lists scans kept in session cache with quick reopen into Ingestion.
 */
export function PreviewSpectraTab({
  entries,
  activeScanId,
  ingestionByScanId,
  onSelectScan,
  onRemoveEntry,
}: PreviewSpectraTabProps) {
  if (entries.length === 0) {
    return (
      <div className="border-border bg-default/30 rounded-lg border border-dashed px-5 py-8">
        <p className="text-foreground text-sm font-medium">Preview spectra</p>
        <p className="text-muted mt-2 text-sm">
          Mark scans as kept in cache from Ingestion to compare reduced spectra here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-muted text-sm">
        {entries.length} scan{entries.length === 1 ? "" : "s"} in session cache.
      </p>
      <ul className="divide-border divide-y rounded-lg border">
        {entries.map((entry) => {
          const ingestion = ingestionByScanId[entry.scanId];
          const pointCount = ingestion?.energyEv.length ?? 0;
          const isActive = entry.scanId === activeScanId;
          return (
            <li
              key={entry.scanId}
              className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
            >
              <div>
                <p className="text-foreground text-sm font-medium">{entry.scanLabel}</p>
                <p className="text-muted text-xs">
                  {entry.edgeLabel ?? "Edge unknown"}
                  {pointCount > 0 ? ` | ${pointCount} energy points` : " | not reduced"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant={isActive ? "primary" : "secondary"}
                  onPress={() => onSelectScan(entry.scanId)}
                >
                  Open in Ingestion
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onPress={() => onRemoveEntry(entry.scanId)}
                >
                  Remove
                </Button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
