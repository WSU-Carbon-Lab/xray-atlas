"use client";

import type { ExperimentType } from "~/prisma/browser";
import { cn } from "@heroui/styles";
import {
  ACQUISITION_MODE_OPTIONS,
  VERIFICATION_FILTER_PANEL_OPTIONS,
  verificationFilterChoiceFromCatalog,
  type VerificationFilterChoice,
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
 * Mutually exclusive verification chips for the unified search dropdown.
 */
export function NexafsVerificationFilterPanel({
  verifiedOnly,
  verificationSource,
  onVerificationChange,
}: {
  verifiedOnly: boolean;
  verificationSource: VerificationSource;
  onVerificationChange: (choice: VerificationFilterChoice) => void;
}) {
  const active = verificationFilterChoiceFromCatalog({
    verifiedOnly,
    verificationSource,
  });

  return (
    <div className="flex flex-wrap gap-1.5 px-3 pb-2">
      {VERIFICATION_FILTER_PANEL_OPTIONS.map(({ value, label }) => {
        const selected = value === active;
        return (
          <button
            key={value}
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              if (!selected) onVerificationChange(value);
            }}
            aria-pressed={selected}
            className={cn(
              "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium transition-opacity hover:opacity-80",
              value === "any"
                ? "bg-surface-secondary text-foreground border-border"
                : "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/25",
              selected ? "ring-accent ring-1" : "",
            )}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
