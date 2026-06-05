"use client";

import { memo, useCallback, useMemo, useState } from "react";
import { Button, ScrollShadow, Spinner } from "@heroui/react";
import { cn } from "@heroui/styles";
import {
  groupCatalogEntries,
  scanCategoryLabel,
  STXM_SCAN_CATEGORY_ORDER,
  type StxmCatalogEntry,
  type StxmScanCategory,
} from "~/lib/stxm";

type ExperimentFileBrowserProps = {
  entries: StxmCatalogEntry[];
  selectedRelativePath: string | null;
  loading: boolean;
  onSelect: (entry: StxmCatalogEntry) => void;
};

function formatEnergy(entry: StxmCatalogEntry): string | null {
  if (entry.energyMinEv !== null && entry.energyMaxEv !== null) {
    if (Math.abs(entry.energyMinEv - entry.energyMaxEv) < 0.05) {
      return `${entry.energyMinEv.toFixed(1)} eV`;
    }
    return `${entry.energyMinEv.toFixed(0)}–${entry.energyMaxEv.toFixed(0)} eV`;
  }
  return null;
}

type ScanCardProps = {
  entry: StxmCatalogEntry;
  selected: boolean;
  onSelect: (entry: StxmCatalogEntry) => void;
};

const ScanCard = memo(function ScanCard({
  entry,
  selected,
  onSelect,
}: ScanCardProps) {
  const energy = formatEnergy(entry);
  const handleClick = useCallback(() => onSelect(entry), [entry, onSelect]);

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        "group flex w-28 shrink-0 flex-col items-center gap-1.5 rounded-lg border p-2 text-left transition-colors",
        selected
          ? "border-accent bg-accent/5 ring-accent/30 ring-1"
          : "border-border bg-surface hover:bg-default/40",
      )}
      title={entry.basename}
    >
      <div className="bg-default/80 relative flex h-24 w-full items-center justify-center overflow-hidden rounded-md">
        {entry.thumbnailDataUrl ? (
          <img
            src={entry.thumbnailDataUrl}
            alt=""
            className="h-full w-full object-contain"
          />
        ) : (
          <span className="text-muted px-2 text-center text-[10px]">No preview</span>
        )}
      </div>
      <span className="text-foreground w-full truncate font-mono text-[11px] leading-tight">
        {entry.basename}
      </span>
      {energy ? (
        <span className="text-muted w-full truncate text-[10px]">{energy}</span>
      ) : null}
    </button>
  );
});

type ScanGroupProps = {
  category: StxmScanCategory;
  entries: StxmCatalogEntry[];
  selectedRelativePath: string | null;
  onSelect: (entry: StxmCatalogEntry) => void;
};

function ScanGroup({
  category,
  entries,
  selectedRelativePath,
  onSelect,
}: ScanGroupProps) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? entries : entries.slice(0, 6);

  if (entries.length === 0) {
    return null;
  }

  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-muted text-xs font-semibold tracking-wide uppercase">
          {scanCategoryLabel(category)} ({entries.length})
        </h3>
        {entries.length > 6 ? (
          <Button
            variant="ghost"
            size="sm"
            onPress={() => setExpanded((value) => !value)}
          >
            {expanded ? "Show less" : `Show all (${entries.length})`}
          </Button>
        ) : null}
      </div>
      {expanded ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
          {visible.map((entry) => (
            <ScanCard
              key={entry.relativePath}
              entry={entry}
              selected={entry.relativePath === selectedRelativePath}
              onSelect={onSelect}
            />
          ))}
        </div>
      ) : (
        <ScrollShadow orientation="horizontal" className="w-full pb-1">
          <div className="flex gap-3">
            {visible.map((entry) => (
              <ScanCard
                key={entry.relativePath}
                entry={entry}
                selected={entry.relativePath === selectedRelativePath}
                onSelect={onSelect}
              />
            ))}
          </div>
        </ScrollShadow>
      )}
    </section>
  );
}

/**
 * Finder-style grouped scan browser with horizontal scroll and expandable groups.
 */
export function ExperimentFileBrowser({
  entries,
  selectedRelativePath,
  loading,
  onSelect,
}: ExperimentFileBrowserProps) {
  const grouped = useMemo(() => groupCatalogEntries(entries), [entries]);

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <Spinner size="lg" />
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <p className="text-muted text-sm">No `.hdr` scans found in this beamtime folder.</p>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {STXM_SCAN_CATEGORY_ORDER.map((category) => (
        <ScanGroup
          key={category}
          category={category}
          entries={grouped.get(category) ?? []}
          selectedRelativePath={selectedRelativePath}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}
