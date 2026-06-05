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
  ingestionChannelUsesRawSignal,
  type StxmIngestionPlotChannel,
} from "~/lib/stxm/stxm-ingestion-display";
import type { StxmPlotScaleMode } from "~/lib/stxm/stxm-region-types";

const plotToolbarCompactTextToggleClass = cn(
  plotToolbarGlyphToggleGroupItemHorizontalClass,
  "h-8 min-w-8 w-auto px-2 text-[11px] font-medium",
);

export type StxmIngestionPlotSecondaryControlsProps = {
  displayChannel: StxmIngestionPlotChannel;
  weightingMode: StxmWeightingMode;
  onWeightingModeChange: (mode: StxmWeightingMode) => void;
  plotScaleMode: StxmPlotScaleMode;
  onPlotScaleModeChange: (mode: StxmPlotScaleMode) => void;
};

/**
 * Compact weighting and Y-scale controls for STXM ingestion (secondary to the left Y-channel rail).
 */
export function StxmIngestionPlotSecondaryControls({
  displayChannel,
  weightingMode,
  onWeightingModeChange,
  plotScaleMode,
  onPlotScaleModeChange,
}: StxmIngestionPlotSecondaryControlsProps) {
  const logScaleDisabled = !ingestionChannelAllowsLogY(displayChannel);
  const onRawSignalChannel = ingestionChannelUsesRawSignal(displayChannel);

  return (
    <div className="pointer-events-none flex shrink-0 flex-wrap items-center gap-2 px-2 py-1.5">
      <Toolbar
        isAttached
        orientation="horizontal"
        aria-label="STXM raw weighting and Y scale"
        className={cn(
          plotToolbarAttachedToolbarHorizontalClass,
          "pointer-events-auto",
        )}
      >
        <ToggleButtonGroup
          aria-label="Raw spectrum weighting"
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
                description="Recomputes per-region raw spectra before the reduction pipeline."
                placement="bottom"
              >
                <ToggleButton
                  id={option.id}
                  className={plotToolbarCompactTextToggleClass}
                >
                  {option.label}
                </ToggleButton>
              </PlotToolbarRichHint>
            </Fragment>
          ))}
        </ToggleButtonGroup>

        <ToggleButtonGroup
          aria-label="Y axis scale"
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
          <ToggleButton id="linear" className={plotToolbarCompactTextToggleClass}>
            Linear
          </ToggleButton>
          <ToggleButtonGroup.Separator />
          <PlotToolbarRichHint
            title="Log scale"
            description="Log10 axis for raw I0, sample, and 1/I0 channels."
            whenDisabledDescription={
              !onRawSignalChannel
                ? "Log scale applies to raw signal channels only."
                : "This channel cannot use a log Y axis."
            }
            placement="bottom"
            disabled={logScaleDisabled}
          >
            <ToggleButton
              id="log"
              isDisabled={logScaleDisabled}
              className={plotToolbarCompactTextToggleClass}
            >
              Log
            </ToggleButton>
          </PlotToolbarRichHint>
        </ToggleButtonGroup>
      </Toolbar>
    </div>
  );
}
