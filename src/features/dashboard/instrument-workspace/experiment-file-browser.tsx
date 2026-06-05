"use client";

import { memo, useCallback, useMemo } from "react";
import { Accordion, ScrollShadow, Spinner } from "@heroui/react";
import { cn } from "@heroui/styles";
import {
  groupCatalogEntries,
  scanCategoryLabel,
  type StxmCatalogEntry,
  type StxmScanCategory,
} from "~/lib/stxm";

type ExperimentFileBrowserProps = {
  entries: StxmCatalogEntry[];
  selectedRelativePath: string | null;
  loading: boolean;
  onSelect: (entry: StxmCatalogEntry) => void;
};

const ACCORDION_CATEGORIES: StxmScanCategory[] = [
  "image_scan",
  "focus_scan",
  "fixed_point",
  "stack",
  "other",
];

const ACCORDION_LABELS: Record<StxmScanCategory, string> = {
  line_scan: "Line scans",
  image_scan: "Image scans",
  focus_scan: "Focus scans",
  fixed_point: "Fixed point",
  stack: "Stacks",
  other: "Other",
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

type HorizontalScanRowProps = {
  entries: StxmCatalogEntry[];
  selectedRelativePath: string | null;
  onSelect: (entry: StxmCatalogEntry) => void;
};

function HorizontalScanRow({
  entries,
  selectedRelativePath,
  onSelect,
}: HorizontalScanRowProps) {
  return (
    <ScrollShadow
      orientation="horizontal"
      className="max-w-full min-w-0 overflow-x-auto pb-1"
    >
      <div className="flex w-max min-w-full gap-3 pr-2">
        {entries.map((entry) => (
          <ScanCard
            key={entry.relativePath}
            entry={entry}
            selected={entry.relativePath === selectedRelativePath}
            onSelect={onSelect}
          />
        ))}
      </div>
    </ScrollShadow>
  );
}

type AccordionScanGroupsProps = {
  grouped: Map<StxmScanCategory, StxmCatalogEntry[]>;
  selectedRelativePath: string | null;
  onSelect: (entry: StxmCatalogEntry) => void;
};

function AccordionScanGroups({
  grouped,
  selectedRelativePath,
  onSelect,
}: AccordionScanGroupsProps) {
  const sections = ACCORDION_CATEGORIES.flatMap((category) => {
    const entries = grouped.get(category) ?? [];
    if (entries.length === 0) {
      return [];
    }
    return [{ category, entries }];
  });

  if (sections.length === 0) {
    return null;
  }

  return (
    <Accordion allowsMultipleExpanded variant="surface" className="min-w-0">
      {sections.map(({ category, entries }) => (
        <Accordion.Item key={category} id={category}>
          <Accordion.Heading>
            <Accordion.Trigger>
              {ACCORDION_LABELS[category]} ({entries.length})
              <Accordion.Indicator />
            </Accordion.Trigger>
          </Accordion.Heading>
          <Accordion.Panel className="min-w-0 overflow-x-auto pb-2">
            <HorizontalScanRow
              entries={entries}
              selectedRelativePath={selectedRelativePath}
              onSelect={onSelect}
            />
          </Accordion.Panel>
        </Accordion.Item>
      ))}
    </Accordion>
  );
}

/**
 * Finder-style scan browser: line scans primary; other types in collapsed accordion groups.
 */
export function ExperimentFileBrowser({
  entries,
  selectedRelativePath,
  loading,
  onSelect,
}: ExperimentFileBrowserProps) {
  const grouped = useMemo(() => groupCatalogEntries(entries), [entries]);
  const lineScans = grouped.get("line_scan") ?? [];

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
    <div className="flex min-w-0 flex-col gap-6">
      {lineScans.length > 0 ? (
        <section className="min-w-0">
          <h3 className="text-muted mb-3 text-xs font-semibold tracking-wide uppercase">
            {scanCategoryLabel("line_scan")} ({lineScans.length})
          </h3>
          <HorizontalScanRow
            entries={lineScans}
            selectedRelativePath={selectedRelativePath}
            onSelect={onSelect}
          />
        </section>
      ) : null}
      <AccordionScanGroups
        grouped={grouped}
        selectedRelativePath={selectedRelativePath}
        onSelect={onSelect}
      />
    </div>
  );
}
