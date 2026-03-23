"use client";

import { XMarkIcon } from "@heroicons/react/24/outline";
import { Button } from "@heroui/react";

export type NexafsBrowseActiveFiltersProps = {
  moleculeLabel: string | null;
  edgeLabel: string | null;
  instrumentLabel: string | null;
  acquisitionLabel: string | null;
  onRemoveMolecule: () => void;
  onRemoveEdge: () => void;
  onRemoveInstrument: () => void;
  onRemoveAcquisition: () => void;
  onClearAll: () => void;
};

export function NexafsBrowseActiveFilters({
  moleculeLabel,
  edgeLabel,
  instrumentLabel,
  acquisitionLabel,
  onRemoveMolecule,
  onRemoveEdge,
  onRemoveInstrument,
  onRemoveAcquisition,
  onClearAll,
}: NexafsBrowseActiveFiltersProps) {
  const hasAny =
    moleculeLabel || edgeLabel || instrumentLabel || acquisitionLabel;
  if (!hasAny) return null;

  return (
    <div
      className="border-border bg-surface flex flex-col gap-3 rounded-xl border px-4 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between"
      role="region"
      aria-label="Active catalog filters"
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-muted text-xs font-semibold uppercase tracking-wide">
          Active filters
        </span>
        {moleculeLabel && (
          <span className="border-border bg-default text-foreground inline-flex max-w-full items-center gap-1 rounded-lg border px-2.5 py-1 text-xs font-medium">
            <span className="truncate">Molecule: {moleculeLabel}</span>
            <button
              type="button"
              onClick={onRemoveMolecule}
              aria-label={`Remove molecule filter ${moleculeLabel}`}
              className="focus-visible:ring-accent shrink-0 rounded p-0.5 hover:bg-black/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 dark:hover:bg-white/10"
            >
              <XMarkIcon className="h-3.5 w-3.5" aria-hidden />
            </button>
          </span>
        )}
        {edgeLabel && (
          <span className="border-border bg-default text-foreground inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs font-medium">
            Edge: {edgeLabel}
            <button
              type="button"
              onClick={onRemoveEdge}
              aria-label={`Remove edge filter ${edgeLabel}`}
              className="focus-visible:ring-accent -mr-0.5 rounded p-0.5 hover:bg-black/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 dark:hover:bg-white/10"
            >
              <XMarkIcon className="h-3.5 w-3.5" aria-hidden />
            </button>
          </span>
        )}
        {instrumentLabel && (
          <span className="border-border bg-default text-foreground inline-flex max-w-full items-center gap-1 rounded-lg border px-2.5 py-1 text-xs font-medium">
            <span className="truncate">Instrument: {instrumentLabel}</span>
            <button
              type="button"
              onClick={onRemoveInstrument}
              aria-label={`Remove instrument filter ${instrumentLabel}`}
              className="focus-visible:ring-accent shrink-0 rounded p-0.5 hover:bg-black/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 dark:hover:bg-white/10"
            >
              <XMarkIcon className="h-3.5 w-3.5" aria-hidden />
            </button>
          </span>
        )}
        {acquisitionLabel && (
          <span className="border-border bg-default text-foreground inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs font-medium">
            Acquisition: {acquisitionLabel}
            <button
              type="button"
              onClick={onRemoveAcquisition}
              aria-label={`Remove acquisition mode filter ${acquisitionLabel}`}
              className="focus-visible:ring-accent -mr-0.5 rounded p-0.5 hover:bg-black/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 dark:hover:bg-white/10"
            >
              <XMarkIcon className="h-3.5 w-3.5" aria-hidden />
            </button>
          </span>
        )}
      </div>
      <Button
        variant="ghost"
        size="sm"
        onPress={onClearAll}
        className="shrink-0"
      >
        <XMarkIcon className="h-4 w-4" aria-hidden />
        Clear all
      </Button>
    </div>
  );
}
