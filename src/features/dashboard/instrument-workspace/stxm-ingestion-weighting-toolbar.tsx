"use client";

import { Fragment } from "react";
import { ToggleButton, ToggleButtonGroup, Toolbar } from "@heroui/react";
import { cn } from "@heroui/styles";
import {
  PlotToolbarRichHint,
  plotToolbarAttachedToggleGroupHorizontalClass,
  plotToolbarAttachedToolbarHorizontalClass,
  plotToolbarGlyphToggleGroupItemHorizontalClass,
} from "~/components/plots/toolbars";
import type { StxmWeightingMode } from "~/lib/stxm/estimators";
import { STXM_INGESTION_WEIGHTING_OPTIONS } from "~/lib/stxm/stxm-ingestion-display";

const plotToolbarHeaderToggleClass = cn(
  plotToolbarGlyphToggleGroupItemHorizontalClass,
  "h-8 min-w-8 w-auto px-2.5 text-xs font-medium",
);

export type StxmIngestionWeightingToolbarProps = {
  weightingMode: StxmWeightingMode;
  onWeightingModeChange: (mode: StxmWeightingMode) => void;
};

/**
 * Compact error-weighting control for STXM region raw spectra (Poisson MLE, inverse count, empirical).
 */
export function StxmIngestionWeightingToolbar({
  weightingMode,
  onWeightingModeChange,
}: StxmIngestionWeightingToolbarProps) {
  return (
    <div className="flex w-full min-w-0 flex-wrap items-center gap-x-2 gap-y-2">
      <span className="text-muted shrink-0 text-xs font-medium">Error kind</span>
      <Toolbar
        isAttached
        orientation="horizontal"
        aria-label="Region spectrum error weighting"
        className={plotToolbarAttachedToolbarHorizontalClass}
      >
        <ToggleButtonGroup
          selectionMode="single"
          orientation="horizontal"
          disallowEmptySelection
          className={plotToolbarAttachedToggleGroupHorizontalClass}
          selectedKeys={[weightingMode]}
          onSelectionChange={(keys) => {
            const key = [...keys][0];
            if (
              key === "poisson_mle" ||
              key === "inverse_count" ||
              key === "empirical"
            ) {
              onWeightingModeChange(key);
            }
          }}
        >
          {STXM_INGESTION_WEIGHTING_OPTIONS.map((option, index) => (
            <Fragment key={option.id}>
              {index > 0 ? <ToggleButtonGroup.Separator /> : null}
              <PlotToolbarRichHint
                title={option.label}
                description="Recomputes per-region raw spectra and error bars before reduction."
                placement="bottom"
              >
                <ToggleButton
                  id={option.id}
                  className={plotToolbarHeaderToggleClass}
                >
                  {option.label}
                </ToggleButton>
              </PlotToolbarRichHint>
            </Fragment>
          ))}
        </ToggleButtonGroup>
      </Toolbar>
    </div>
  );
}
