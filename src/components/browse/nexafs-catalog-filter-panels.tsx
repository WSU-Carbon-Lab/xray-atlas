"use client";

import type { ExperimentType } from "~/prisma/browser";
import { CheckIcon } from "@heroicons/react/24/outline";
import { cn } from "@heroui/styles";
import {
  ACQUISITION_MODE_OPTIONS,
  VERIFICATION_SOURCE_OPTIONS,
  VERIFICATION_SOURCE_LABELS,
} from "./nexafs-filter-options";
import type { VerificationSource } from "./nexafs-browse-experiment-utils";

/**
 * Acquisition mode chips for the unified search dropdown (TEY, PEY, FY, TRANS).
 */
export function NexafsAcquisitionFilterPanel({
  experimentType,
  onExperimentTypeChange,
}: {
  experimentType: ExperimentType | undefined;
  onExperimentTypeChange: (value: ExperimentType | undefined) => void;
}) {
  const hasSelection = experimentType != null;

  return (
    <div className="flex flex-wrap gap-1.5 px-3 pb-1">
      <button
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => onExperimentTypeChange(undefined)}
        aria-pressed={!hasSelection}
        className={cn(
          "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium transition-opacity hover:opacity-80",
          "bg-surface-secondary text-foreground border-border",
          !hasSelection ? "ring-accent ring-1" : "",
        )}
      >
        Any mode
      </button>
      {ACQUISITION_MODE_OPTIONS.map(([value, text]) => {
        const selected = value === experimentType;
        return (
          <button
            key={value}
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => onExperimentTypeChange(selected ? undefined : value)}
            aria-pressed={selected}
            className={cn(
              "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium transition-opacity hover:opacity-80",
              "bg-[color-mix(in_oklch,var(--accent)_12%,transparent)] text-accent border-[color-mix(in_oklch,var(--accent)_28%,transparent)]",
              selected ? "ring-accent ring-1" : "",
            )}
          >
            {text}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Verification toggle and source chips for the unified search dropdown.
 */
export function NexafsVerificationFilterPanel({
  verifiedOnly,
  verificationSource,
  onVerifiedOnlyChange,
  onVerificationSourceChange,
}: {
  verifiedOnly: boolean;
  verificationSource: VerificationSource;
  onVerifiedOnlyChange: (value: boolean) => void;
  onVerificationSourceChange: (source: VerificationSource) => void;
}) {
  return (
    <div className="space-y-2 px-3 pb-2">
      <button
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => onVerifiedOnlyChange(!verifiedOnly)}
        aria-pressed={verifiedOnly}
        className={cn(
          "focus-visible:ring-accent flex w-full items-center justify-between rounded-md border px-2.5 py-2 text-left text-sm transition-colors focus:outline-none focus-visible:ring-2",
          verifiedOnly
            ? "bg-accent-soft text-foreground ring-accent/35 ring-1"
            : "border-border text-muted hover:bg-default hover:text-foreground",
        )}
      >
        <span className="font-medium">Only verified datasets</span>
        {verifiedOnly ? (
          <CheckIcon className="text-accent h-4 w-4 shrink-0" aria-hidden />
        ) : null}
      </button>
      <div className="border-border-default flex flex-wrap gap-1.5 rounded-md border p-1.5">
        {VERIFICATION_SOURCE_OPTIONS.map((option) => {
          const selected = verificationSource === option;
          return (
            <button
              key={option}
              type="button"
              disabled={!verifiedOnly}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => onVerificationSourceChange(option)}
              aria-pressed={verifiedOnly && selected}
              className={cn(
                "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium transition-opacity",
                !verifiedOnly
                  ? "text-muted cursor-not-allowed opacity-50"
                  : selected
                    ? "bg-accent-soft text-foreground ring-accent ring-1"
                    : "text-muted hover:bg-default hover:text-foreground border-transparent",
              )}
            >
              {VERIFICATION_SOURCE_LABELS[option]}
            </button>
          );
        })}
      </div>
    </div>
  );
}
