"use client";

import { useMemo } from "react";
import { Spinner } from "@heroui/react";
import type { StreamBeamtimeCatalogPhase } from "~/features/dashboard/lib/buildBeamtimeCatalog";
import { filterCatalogLineScans } from "~/features/dashboard/lib/line-scan-catalog";
import { scanCategoryLabel, type StxmCatalogEntry } from "~/lib/stxm";
import { HorizontalScanCatalogRow } from "./scan-catalog-cards";

type LineScanBrowserStripProps = {
  entries: StxmCatalogEntry[];
  selectedRelativePath: string | null;
  loading?: boolean;
  enriching?: boolean;
  isSelectingScan?: boolean;
  selectingRelativePath?: string | null;
  scanPhase?: StreamBeamtimeCatalogPhase | null;
  onSelect: (entry: StxmCatalogEntry) => void;
};

/**
 * Compact horizontal line-scan browser for the ingestion tab.
 * Reuses experiment catalog data so users can switch scans without returning to Experiment.
 */
export function LineScanBrowserStrip({
  entries,
  selectedRelativePath,
  loading = false,
  enriching = false,
  isSelectingScan = false,
  selectingRelativePath = null,
  scanPhase = null,
  onSelect,
}: LineScanBrowserStripProps) {
  const lineScans = useMemo(() => filterCatalogLineScans(entries), [entries]);
  const busyPath = isSelectingScan ? selectingRelativePath : null;

  if (loading && lineScans.length === 0) {
    return (
      <section
        className="border-border bg-default/20 flex flex-col gap-2 rounded-lg border px-3 py-3"
        aria-label="Line scans"
      >
        <div className="flex items-center gap-2">
          <Spinner size="sm" />
          <p className="text-muted text-xs">
            {scanPhase === "listing" ? "Listing line scans..." : "Loading scans..."}
          </p>
        </div>
      </section>
    );
  }

  if (lineScans.length === 0) {
    return (
      <section
        className="border-border bg-default/20 rounded-lg border px-3 py-3"
        aria-label="Line scans"
      >
        <p className="text-muted text-xs">
          No NEXAFS line scans found in this experiment folder.
        </p>
      </section>
    );
  }

  return (
    <section
      className="border-border bg-default/20 flex min-w-0 flex-col gap-2 rounded-lg border px-3 py-3"
      aria-label="Line scans"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-muted text-xs font-semibold tracking-wide uppercase">
          {scanCategoryLabel("line_scan")} ({lineScans.length})
        </h3>
        {loading || enriching || isSelectingScan ? (
          <div className="text-muted flex items-center gap-1.5 text-[10px]">
            <Spinner size="sm" />
            {isSelectingScan
              ? "Loading scan..."
              : enriching
                ? "Loading previews..."
                : "Refreshing scans..."}
          </div>
        ) : null}
      </div>
      <HorizontalScanCatalogRow
        entries={lineScans}
        selectedRelativePath={selectedRelativePath}
        busyRelativePath={busyPath}
        onSelect={onSelect}
      />
    </section>
  );
}
