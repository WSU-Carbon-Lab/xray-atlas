"use client";

import { Button, ScrollShadow, Spinner } from "@heroui/react";
import { cn } from "@heroui/styles";
import { FolderOpen } from "lucide-react";
import type { BeamtimeFolderSummary } from "~/lib/stxm/experimentFolder";

type BeamtimeScrollerProps = {
  beamtimes: BeamtimeFolderSummary[];
  selectedName: string | null;
  onSelect: (name: string) => void;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
};

/**
 * Horizontal beamtime folder cards for the Experiment tab.
 */
export function BeamtimeScroller({
  beamtimes,
  selectedName,
  onSelect,
  loading = false,
  error = null,
  onRetry,
}: BeamtimeScrollerProps) {
  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Spinner size="md" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="border-border bg-default/30 flex flex-col items-start gap-3 rounded-lg border px-4 py-4">
        <p className="text-foreground text-sm">{error}</p>
        {onRetry ? (
          <Button size="sm" variant="secondary" onPress={onRetry}>
            Retry folder scan
          </Button>
        ) : null}
      </div>
    );
  }

  if (beamtimes.length === 0) {
    return (
      <p className="text-muted text-sm">
        No experiment folders found. Pick a beamtime root such as{" "}
        <span className="font-mono">BL5321 (New STXM)</span> or a month folder
        like <span className="font-mono">2026-03(March)</span>.
      </p>
    );
  }

  return (
    <ScrollShadow orientation="horizontal" className="w-full pb-2">
      <div className="flex gap-3">
        {beamtimes.map((beamtime) => {
          const selected = beamtime.name === selectedName;
          return (
            <button
              key={beamtime.name}
              type="button"
              onClick={() => onSelect(beamtime.name)}
              className={cn(
                "border-border bg-surface hover:bg-default/40 flex w-52 shrink-0 flex-col gap-2 rounded-lg border px-4 py-3 text-left transition-colors",
                selected && "border-accent bg-accent/5 ring-accent/30 ring-1",
              )}
            >
              <span className="text-foreground flex items-center gap-2 text-sm font-medium">
                <FolderOpen className="text-accent h-4 w-4 shrink-0" aria-hidden />
                <span className="truncate">{beamtime.name}</span>
              </span>
              <span className="text-muted text-xs">
                {beamtime.scanCount} scan{beamtime.scanCount === 1 ? "" : "s"}
                {beamtime.nexafsLineScanCount > 0
                  ? ` · ${beamtime.nexafsLineScanCount} NEXAFS line`
                  : ""}
              </span>
            </button>
          );
        })}
      </div>
    </ScrollShadow>
  );
}
