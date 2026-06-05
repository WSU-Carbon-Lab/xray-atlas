"use client";

import { Fragment } from "react";
import { ToggleButton, ToggleButtonGroup, Toolbar } from "@heroui/react";
import { cn } from "@heroui/styles";
import {
  PlotToolbarGroupSeparator,
  PlotToolbarRichHint,
  plotToolbarAttachedToggleGroupHorizontalClass,
  plotToolbarAttachedToolbarHorizontalClass,
  plotToolbarGlyphToggleGroupItemHorizontalClass,
} from "~/components/plots/toolbars";
import type { StxmWeightingMode } from "~/lib/stxm/estimators";
import {
  STXM_INGESTION_REDUCED_CHANNEL_OPTIONS,
  STXM_INGESTION_SIGNAL_CHANNEL_OPTIONS,
  STXM_INGESTION_WEIGHTING_OPTIONS,
  ingestionChannelAllowsLogY,
  ingestionChannelUsesRawSignal,
  type StxmIngestionPlotChannel,
} from "~/lib/stxm/stxm-ingestion-display";
import type { StxmPlotScaleMode } from "~/lib/stxm/stxm-region-types";

const plotToolbarTextToggleItemClass = cn(
  plotToolbarGlyphToggleGroupItemHorizontalClass,
  "h-9 min-w-9 w-auto px-2.5 text-xs font-medium",
);

export type StxmIngestionPlotRailProps = {
  displayChannel: StxmIngestionPlotChannel;
  onDisplayChannelChange: (channel: StxmIngestionPlotChannel) => void;
  weightingMode: StxmWeightingMode;
  onWeightingModeChange: (mode: StxmWeightingMode) => void;
  plotScaleMode: StxmPlotScaleMode;
  onPlotScaleModeChange: (mode: StxmPlotScaleMode) => void;
  /** When false, reduced-channel toggles stay disabled until the pipeline produces a result. */
  hasReducedResult: boolean;
};

function isStxmIngestionPlotChannel(value: string): value is StxmIngestionPlotChannel {
  return (
    STXM_INGESTION_SIGNAL_CHANNEL_OPTIONS.some((option) => option.id === value) ||
    STXM_INGESTION_REDUCED_CHANNEL_OPTIONS.some((option) => option.id === value)
  );
}

/**
 * Horizontal plot toolbar for STXM ingestion: raw signal, reduced channels, weighting, and Y scale.
 */
export function StxmIngestionPlotRail({
  displayChannel,
  onDisplayChannelChange,
  weightingMode,
  onWeightingModeChange,
  plotScaleMode,
  onPlotScaleModeChange,
  hasReducedResult,
}: StxmIngestionPlotRailProps) {
  const logScaleDisabled = !ingestionChannelAllowsLogY(displayChannel);
  const onRawSignalChannel = ingestionChannelUsesRawSignal(displayChannel);
  const signalSelectedKeys = onRawSignalChannel ? [displayChannel] : [];
  const reducedSelectedKeys = !onRawSignalChannel ? [displayChannel] : [];

  return (
    <div className="pointer-events-none flex shrink-0 flex-wrap items-center gap-2 px-2 py-2">
      <Toolbar
        isAttached
        orientation="horizontal"
        aria-label="STXM spectrum display"
        className={cn(plotToolbarAttachedToolbarHorizontalClass, "pointer-events-auto")}
      >
        <ToggleButtonGroup
          aria-label="Raw signal channel"
          selectionMode="single"
          orientation="horizontal"
          disallowEmptySelection
          className={plotToolbarAttachedToggleGroupHorizontalClass}
          selectedKeys={signalSelectedKeys}
          onSelectionChange={(keys) => {
            const key = [...keys][0];
            if (typeof key === "string" && isStxmIngestionPlotChannel(key)) {
              onDisplayChannelChange(key);
            }
          }}
        >
          {STXM_INGESTION_SIGNAL_CHANNEL_OPTIONS.map((option, index) => (
            <Fragment key={option.id}>
              {index > 0 ? <ToggleButtonGroup.Separator /> : null}
              <ToggleButton
                id={option.id}
                className={plotToolbarTextToggleItemClass}
              >
                {option.label}
              </ToggleButton>
            </Fragment>
          ))}
        </ToggleButtonGroup>

        <PlotToolbarGroupSeparator orientation="vertical" />

        <ToggleButtonGroup
          aria-label="Reduced spectrum channel"
          selectionMode="single"
          orientation="horizontal"
          disallowEmptySelection
          className={plotToolbarAttachedToggleGroupHorizontalClass}
          selectedKeys={reducedSelectedKeys}
          onSelectionChange={(keys) => {
            const key = [...keys][0];
            if (typeof key === "string" && isStxmIngestionPlotChannel(key)) {
              onDisplayChannelChange(key);
            }
          }}
        >
          {STXM_INGESTION_REDUCED_CHANNEL_OPTIONS.map((option, index) => (
            <Fragment key={option.id}>
              {index > 0 ? <ToggleButtonGroup.Separator /> : null}
              <PlotToolbarRichHint
                title={option.label}
                description={`Plot the ${option.label} trace from the reduced pipeline.`}
                whenDisabledDescription="Configure sample and izero regions to compute reduced spectra."
                placement="bottom"
                disabled={!hasReducedResult}
              >
                <ToggleButton
                  id={option.id}
                  isDisabled={!hasReducedResult}
                  className={plotToolbarTextToggleItemClass}
                >
                  {option.label}
                </ToggleButton>
              </PlotToolbarRichHint>
            </Fragment>
          ))}
        </ToggleButtonGroup>

        <PlotToolbarGroupSeparator orientation="vertical" />

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
                  className={plotToolbarTextToggleItemClass}
                >
                  {option.label}
                </ToggleButton>
              </PlotToolbarRichHint>
            </Fragment>
          ))}
        </ToggleButtonGroup>

        <PlotToolbarGroupSeparator orientation="vertical" />

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
          <ToggleButton id="linear" className={plotToolbarTextToggleItemClass}>
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
              className={plotToolbarTextToggleItemClass}
            >
              Log
            </ToggleButton>
          </PlotToolbarRichHint>
        </ToggleButtonGroup>
      </Toolbar>
    </div>
  );
}
