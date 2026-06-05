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
import {
  STXM_INGESTION_WEIGHTING_OPTIONS,
  ingestionChannelAllowsLogY,
  type StxmIngestionPlotChannel,
} from "~/lib/stxm/stxm-ingestion-display";
import type { StxmPlotScaleMode } from "~/lib/stxm/stxm-region-types";

const plotToolbarHeaderToggleClass = cn(
  plotToolbarGlyphToggleGroupItemHorizontalClass,
  "h-8 min-w-8 w-auto px-2.5 text-xs font-medium",
);

export type StxmIngestionPlotHeaderProps = {
  displayChannel: StxmIngestionPlotChannel;
  weightingMode: StxmWeightingMode;
  onWeightingModeChange: (mode: StxmWeightingMode) => void;
  plotScaleMode: StxmPlotScaleMode;
  onPlotScaleModeChange: (mode: StxmPlotScaleMode) => void;
};

/**
 * Plot header row for STXM ingestion: error-kind weighting and linear/log Y scale (browse-style attached toggles).
 */
export function StxmIngestionPlotHeader({
  displayChannel,
  weightingMode,
  onWeightingModeChange,
  plotScaleMode,
  onPlotScaleModeChange,
}: StxmIngestionPlotHeaderProps) {
  const logScaleDisabled = !ingestionChannelAllowsLogY(displayChannel);

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

      <div className="ml-auto flex min-w-0 flex-wrap items-center justify-end gap-2">
        <span className="text-muted shrink-0 text-xs font-medium">Y scale</span>
        <Toolbar
          isAttached
          orientation="horizontal"
          aria-label="Spectrum Y axis scale"
          className={plotToolbarAttachedToolbarHorizontalClass}
        >
          <ToggleButtonGroup
            selectionMode="single"
            orientation="horizontal"
            disallowEmptySelection
            className={plotToolbarAttachedToggleGroupHorizontalClass}
            selectedKeys={[plotScaleMode]}
            onSelectionChange={(keys) => {
              const key = [...keys][0];
              if (key === "linear" || key === "log") {
                onPlotScaleModeChange(key);
              }
            }}
          >
            <ToggleButton id="linear" className={plotToolbarHeaderToggleClass}>
              Linear
            </ToggleButton>
            <ToggleButtonGroup.Separator />
            <PlotToolbarRichHint
              title="Log scale"
              description="Log10 axis for raw I0, sample, and 1/I0 channels."
              whenDisabledDescription="Log scale applies to raw signal channels only."
              placement="bottom"
              disabled={logScaleDisabled}
            >
              <ToggleButton
                id="log"
                isDisabled={logScaleDisabled}
                className={plotToolbarHeaderToggleClass}
              >
                Log
              </ToggleButton>
            </PlotToolbarRichHint>
          </ToggleButtonGroup>
        </Toolbar>
      </div>
    </div>
  );
}
