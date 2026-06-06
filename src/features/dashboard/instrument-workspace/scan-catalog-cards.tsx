"use client";

import { memo, useCallback, type CSSProperties } from "react";
import { ScrollShadow } from "@heroui/react";
import { cn } from "@heroui/styles";
import { FileImage } from "lucide-react";
import {
  catalogEntryEnrichmentStatus,
  type StxmCatalogEntry,
} from "~/lib/stxm";

const MAX_STAGGER_INDEX = 12;
const STAGGER_MS = 35;

/**
 * Formats the energy span on a catalog row for compact scan cards.
 */
export function formatCatalogEntryEnergy(entry: StxmCatalogEntry): string | null {
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

export type ScanCatalogCardProps = {
  entry: StxmCatalogEntry;
  selected: boolean;
  animationIndex: number;
  busy?: boolean;
  onSelect: (entry: StxmCatalogEntry) => void;
};

/**
 * Compact thumbnail card for a single STXM catalog row.
 */
export const ScanCatalogCard = memo(function ScanCatalogCard({
  entry,
  selected,
  animationIndex,
  busy = false,
  onSelect,
}: ScanCatalogCardProps) {
  const energy = formatCatalogEntryEnergy(entry);
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
      disabled={busy}
      style={staggerStyle(animationIndex)}
      className={cn(
        "animate-in slide-in-from-bottom group flex w-28 shrink-0 flex-col items-center gap-1.5 rounded-lg border p-2 text-left transition-colors motion-reduce:animate-none",
        selected
          ? "border-accent bg-accent/5 ring-accent/30 ring-1"
          : "border-border bg-surface hover:bg-default/40",
        status === "placeholder" && "opacity-90",
        busy && "pointer-events-none opacity-60",
      )}
      title={entry.basename}
      aria-busy={busy || status === "placeholder"}
      aria-current={selected ? "true" : undefined}
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

export type HorizontalScanCatalogRowProps = {
  entries: StxmCatalogEntry[];
  selectedRelativePath: string | null;
  busyRelativePath?: string | null;
  onSelect: (entry: StxmCatalogEntry) => void;
  animateFromIndex?: number;
};

/**
 * Horizontally scrollable row of STXM scan catalog cards.
 */
export function HorizontalScanCatalogRow({
  entries,
  selectedRelativePath,
  busyRelativePath = null,
  onSelect,
  animateFromIndex = 0,
}: HorizontalScanCatalogRowProps) {
  return (
    <ScrollShadow
      orientation="horizontal"
      className="max-w-full min-w-0 overflow-x-auto pb-1"
    >
      <div className="flex w-max min-w-full gap-3 pr-2">
        {entries.map((entry, index) => (
          <ScanCatalogCard
            key={entry.relativePath}
            entry={entry}
            animationIndex={animateFromIndex + index}
            selected={entry.relativePath === selectedRelativePath}
            busy={entry.relativePath === busyRelativePath}
            onSelect={onSelect}
          />
        ))}
      </div>
    </ScrollShadow>
  );
}

