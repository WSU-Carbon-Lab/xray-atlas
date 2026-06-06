"use client";

import { useMemo } from "react";
import { Accordion, Spinner } from "@heroui/react";
import type { StreamBeamtimeCatalogPhase } from "~/features/dashboard/lib/buildBeamtimeCatalog";
import {
  groupCatalogEntries,
  scanCategoryLabel,
  type StxmCatalogEntry,
  type StxmScanCategory,
} from "~/lib/stxm";
import { partitionCatalogEntries } from "~/features/dashboard/lib/line-scan-catalog";
import { HorizontalScanCatalogRow } from "./scan-catalog-cards";

type ExperimentFileBrowserProps = {
  entries: StxmCatalogEntry[];
  selectedRelativePath: string | null;
  loading: boolean;
  enriching?: boolean;
  scanPhase?: StreamBeamtimeCatalogPhase | null;
  fromCache?: boolean;
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

function catalogProgressLabel(input: {
  loading: boolean;
  scanPhase: StreamBeamtimeCatalogPhase | null | undefined;
  fromCache: boolean;
  entryCount: number;
  placeholderCount: number;
  allPlaceholderPhase: boolean;
}): string | null {
  if (!input.loading) {
    return null;
  }
  if (input.entryCount > 0 && (input.scanPhase === "cache" || input.fromCache)) {
    return `Refreshing ${input.entryCount} cached scan${input.entryCount === 1 ? "" : "s"}…`;
  }
  if (input.scanPhase === "cache" || input.fromCache) {
    return `Loaded ${input.entryCount} scan${input.entryCount === 1 ? "" : "s"} from cache…`;
  }
  if (input.allPlaceholderPhase) {
    return `Found ${input.entryCount} scan${input.entryCount === 1 ? "" : "s"}…`;
  }
  if (input.scanPhase === "parsing" || input.placeholderCount > 0) {
    return `Reading metadata for ${input.placeholderCount} scan${input.placeholderCount === 1 ? "" : "s"}…`;
  }
  if (input.scanPhase === "listing") {
    return "Listing scans…";
  }
  return `Found ${input.entryCount} scan${input.entryCount === 1 ? "" : "s"}…`;
}

type AccordionScanGroupsProps = {
  grouped: Map<StxmScanCategory, StxmCatalogEntry[]>;
  selectedRelativePath: string | null;
  onSelect: (entry: StxmCatalogEntry) => void;
  animateFromIndex?: number;
};

function AccordionScanGroups({
  grouped,
  selectedRelativePath,
  onSelect,
  animateFromIndex = 0,
}: AccordionScanGroupsProps) {
  const sections = ACCORDION_CATEGORIES.flatMap((category) => {
    const categoryEntries = grouped.get(category) ?? [];
    if (categoryEntries.length === 0) {
      return [];
    }
    return [{ category, entries: categoryEntries }];
  });

  if (sections.length === 0) {
    return null;
  }

  let runningIndex = animateFromIndex;

  return (
    <Accordion allowsMultipleExpanded variant="surface" className="min-w-0">
      {sections.map(({ category, entries }) => {
        const sectionStart = runningIndex;
        runningIndex += entries.length;
        return (
          <Accordion.Item key={category} id={category}>
            <Accordion.Heading>
              <Accordion.Trigger>
                {ACCORDION_LABELS[category]} ({entries.length})
                <Accordion.Indicator />
              </Accordion.Trigger>
            </Accordion.Heading>
            <Accordion.Panel className="min-w-0 overflow-x-auto pb-2">
              <HorizontalScanCatalogRow
                entries={entries}
                selectedRelativePath={selectedRelativePath}
                onSelect={onSelect}
                animateFromIndex={sectionStart}
              />
            </Accordion.Panel>
          </Accordion.Item>
        );
      })}
    </Accordion>
  );
}

/**
 * Finder-style scan browser: placeholders in one group, then categorized rows as metadata arrives.
 */
export function ExperimentFileBrowser({
  entries,
  selectedRelativePath,
  loading,
  enriching = false,
  scanPhase = null,
  fromCache = false,
  onSelect,
}: ExperimentFileBrowserProps) {
  const { placeholders, parsed } = useMemo(
    () => partitionCatalogEntries(entries),
    [entries],
  );
  const grouped = useMemo(() => groupCatalogEntries(parsed), [parsed]);
  const lineScans = grouped.get("line_scan") ?? [];
  const allPlaceholderPhase =
    entries.length > 0 && placeholders.length === entries.length;
  const metadataPending = placeholders.length > 0;
  const showCategorizedLayout = !allPlaceholderPhase && parsed.length > 0;
  const progressLabel = catalogProgressLabel({
    loading,
    scanPhase,
    fromCache,
    entryCount: entries.length,
    placeholderCount: placeholders.length,
    allPlaceholderPhase,
  });

  if (loading && entries.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-10">
        <Spinner size="lg" />
        <p className="text-muted text-sm">Discovering `.hdr` files...</p>
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <p className="text-muted text-sm">
        No `.hdr` scans found in this beamtime folder.
      </p>
    );
  }

  return (
    <div className="flex min-w-0 flex-col gap-6">
      {progressLabel ? (
        <div className="text-muted flex items-center gap-2 text-xs">
          <Spinner size="sm" />
          {progressLabel}
        </div>
      ) : null}
      {enriching ? (
        <div className="text-muted flex items-center gap-2 text-xs">
          <Spinner size="sm" />
          Loading scan previews...
        </div>
      ) : null}

      {allPlaceholderPhase ? (
        <section className="min-w-0">
          <h3 className="text-muted mb-3 text-xs font-semibold tracking-wide uppercase">
            All scans ({entries.length})
          </h3>
          <HorizontalScanCatalogRow
            entries={entries}
            selectedRelativePath={selectedRelativePath}
            onSelect={onSelect}
          />
        </section>
      ) : null}

      {metadataPending && !allPlaceholderPhase ? (
        <section className="min-w-0">
          <h3 className="text-muted mb-3 text-xs font-semibold tracking-wide uppercase">
            Loading metadata ({placeholders.length})
          </h3>
          <HorizontalScanCatalogRow
            entries={placeholders}
            selectedRelativePath={selectedRelativePath}
            onSelect={onSelect}
          />
        </section>
      ) : null}

      {showCategorizedLayout ? (
        <div className="animate-in fade-in flex min-w-0 flex-col gap-6 duration-300 motion-reduce:animate-none">
          {lineScans.length > 0 ? (
            <section className="min-w-0">
              <h3 className="text-muted mb-3 text-xs font-semibold tracking-wide uppercase">
                {scanCategoryLabel("line_scan")} ({lineScans.length})
              </h3>
              <HorizontalScanCatalogRow
                entries={lineScans}
                selectedRelativePath={selectedRelativePath}
                onSelect={onSelect}
                animateFromIndex={placeholders.length}
              />
            </section>
          ) : null}
          <AccordionScanGroups
            grouped={grouped}
            selectedRelativePath={selectedRelativePath}
            onSelect={onSelect}
            animateFromIndex={placeholders.length + lineScans.length}
          />
        </div>
      ) : null}
    </div>
  );
}
