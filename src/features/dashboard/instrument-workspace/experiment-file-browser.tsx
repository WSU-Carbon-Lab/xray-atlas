"use client";

import { memo, useCallback, useMemo, type CSSProperties } from "react";
import { Accordion, ScrollShadow, Spinner } from "@heroui/react";
import { cn } from "@heroui/styles";
import { FileImage } from "lucide-react";
import type { StreamBeamtimeCatalogPhase } from "~/features/dashboard/lib/buildBeamtimeCatalog";
import {
  catalogEntryEnrichmentStatus,
  groupCatalogEntries,
  scanCategoryLabel,
  type StxmCatalogEntry,
  type StxmScanCategory,
} from "~/lib/stxm";

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

const MAX_STAGGER_INDEX = 12;
const STAGGER_MS = 35;

function formatEnergy(entry: StxmCatalogEntry): string | null {
  if (entry.energyMinEv !== null && entry.energyMaxEv !== null) {
    if (Math.abs(entry.energyMinEv - entry.energyMaxEv) < 0.05) {
      return `${entry.energyMinEv.toFixed(1)} eV`;
    }
    return `${entry.energyMinEv.toFixed(0)}–${entry.energyMaxEv.toFixed(0)} eV`;
  }
  return null;
}

function staggerStyle(index: number): CSSProperties | undefined {
  if (index <= 0) {
    return undefined;
  }
  return {
    animationDelay: `${Math.min(index, MAX_STAGGER_INDEX) * STAGGER_MS}ms`,
  };
}

type ScanPreviewProps = {
  entry: StxmCatalogEntry;
};

function ScanPreview({ entry }: ScanPreviewProps) {
  const status = catalogEntryEnrichmentStatus(entry);
  const hasThumbnail = Boolean(entry.thumbnailDataUrl);

  return (
    <div className="bg-default/80 relative flex h-24 w-full items-center justify-center overflow-hidden rounded-md">
      {status === "placeholder" ? (
        <div
          className="text-muted flex h-full w-full flex-col items-center justify-center gap-1.5"
          aria-hidden
        >
          <FileImage className="h-7 w-7 opacity-40" strokeWidth={1.25} />
          <span
            className="bg-default h-1.5 w-12 rounded-full"
            style={{
              backgroundImage:
                "linear-gradient(90deg, var(--color-default) 0%, color-mix(in oklch, var(--color-muted) 35%, transparent) 50%, var(--color-default) 100%)",
              backgroundSize: "200% 100%",
              animation: "skeleton-shimmer 1.4s ease-in-out infinite",
            }}
          />
        </div>
      ) : (
        <>
          {!hasThumbnail ? (
            <span className="text-muted px-2 text-center text-[10px]">
              No preview
            </span>
          ) : null}
          {hasThumbnail ? (
            <img
              src={entry.thumbnailDataUrl ?? undefined}
              alt=""
              className={cn(
                "absolute inset-0 h-full w-full object-contain transition-opacity duration-300",
                status === "thumbnail" ? "fade-in opacity-100" : "opacity-0",
              )}
            />
          ) : null}
        </>
      )}
    </div>
  );
}

type ScanCardProps = {
  entry: StxmCatalogEntry;
  selected: boolean;
  animationIndex: number;
  onSelect: (entry: StxmCatalogEntry) => void;
};

const ScanCard = memo(function ScanCard({
  entry,
  selected,
  animationIndex,
  onSelect,
}: ScanCardProps) {
  const energy = formatEnergy(entry);
  const status = catalogEntryEnrichmentStatus(entry);
  const handleClick = useCallback(() => onSelect(entry), [entry, onSelect]);
  const scanTypeLabel =
    status === "placeholder"
      ? "Loading metadata..."
      : entry.scanType || "Unknown scan";

  return (
    <button
      type="button"
      onClick={handleClick}
      style={staggerStyle(animationIndex)}
      className={cn(
        "animate-in slide-in-from-bottom group flex w-28 shrink-0 flex-col items-center gap-1.5 rounded-lg border p-2 text-left transition-colors motion-reduce:animate-none",
        selected
          ? "border-accent bg-accent/5 ring-accent/30 ring-1"
          : "border-border bg-surface hover:bg-default/40",
        status === "placeholder" && "opacity-90",
      )}
      title={entry.basename}
      aria-busy={status === "placeholder"}
    >
      <ScanPreview entry={entry} />
      <span className="text-foreground w-full truncate font-mono text-[11px] leading-tight">
        {entry.basename}
      </span>
      {energy ? (
        <span className="text-muted w-full truncate text-[10px]">{energy}</span>
      ) : status !== "placeholder" ? (
        <span className="text-muted w-full truncate text-[10px]">
          {scanTypeLabel}
        </span>
      ) : (
        <span className="text-muted w-full truncate text-[10px] italic">
          {scanTypeLabel}
        </span>
      )}
    </button>
  );
});

type HorizontalScanRowProps = {
  entries: StxmCatalogEntry[];
  selectedRelativePath: string | null;
  onSelect: (entry: StxmCatalogEntry) => void;
  animateFromIndex?: number;
};

function HorizontalScanRow({
  entries,
  selectedRelativePath,
  onSelect,
  animateFromIndex = 0,
}: HorizontalScanRowProps) {
  return (
    <ScrollShadow
      orientation="horizontal"
      className="max-w-full min-w-0 overflow-x-auto pb-1"
    >
      <div className="flex w-max min-w-full gap-3 pr-2">
        {entries.map((entry, index) => (
          <ScanCard
            key={entry.relativePath}
            entry={entry}
            animationIndex={animateFromIndex + index}
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
              <HorizontalScanRow
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

function partitionCatalogEntries(entries: StxmCatalogEntry[]): {
  placeholders: StxmCatalogEntry[];
  parsed: StxmCatalogEntry[];
} {
  const placeholders: StxmCatalogEntry[] = [];
  const parsed: StxmCatalogEntry[] = [];
  for (const entry of entries) {
    if (catalogEntryEnrichmentStatus(entry) === "placeholder") {
      placeholders.push(entry);
    } else {
      parsed.push(entry);
    }
  }
  return { placeholders, parsed };
}

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
          <HorizontalScanRow
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
          <HorizontalScanRow
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
              <HorizontalScanRow
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
