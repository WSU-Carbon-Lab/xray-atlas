"use client";

import { ToggleButton, ToggleButtonGroup, Toolbar } from "@heroui/react";
import { cn } from "@heroui/styles";
import {
  PlotToolbarRichHint,
  plotToolbarAttachedToggleGroupHorizontalClass,
  plotToolbarAttachedToolbarHorizontalClass,
  plotToolbarGlyphToggleGroupItemHorizontalClass,
} from "~/components/plots/toolbars";
import type { StxmRawSignalTransformMode } from "~/lib/stxm/stxm-raw-signal-transform";

const toggleClass = cn(
  plotToolbarGlyphToggleGroupItemHorizontalClass,
  "min-w-9 px-2 text-xs font-medium",
);

export type StxmRawSignalTransformToggleProps = {
  mode: StxmRawSignalTransformMode;
  onModeChange: (mode: StxmRawSignalTransformMode) => void;
  disabled?: boolean;
};

/**
 * Horizontal transform group for raw intensity channels: linear signal, reciprocal, log reciprocal.
 */
export function StxmRawSignalTransformToggle({
  mode,
  onModeChange,
  disabled = false,
}: StxmRawSignalTransformToggleProps) {
  return (
    <Toolbar
      isAttached
      orientation="horizontal"
      aria-label="Raw intensity transform"
      className={plotToolbarAttachedToolbarHorizontalClass}
    >
      <ToggleButtonGroup
        selectionMode="single"
        orientation="horizontal"
        disallowEmptySelection
        isDisabled={disabled}
        className={plotToolbarAttachedToggleGroupHorizontalClass}
        selectedKeys={[mode]}
        onSelectionChange={(keys) => {
          const key = [...keys][0];
          if (
            key === "signal" ||
            key === "reciprocal" ||
            key === "log_reciprocal"
          ) {
            onModeChange(key);
          }
        }}
      >
        <PlotToolbarRichHint
          title="Signal"
          description="Plot raw summed intensity on a linear axis."
          placement="right"
          disabled={disabled}
        >
          <ToggleButton id="signal" className={toggleClass}>
            Sig
          </ToggleButton>
        </PlotToolbarRichHint>
        <ToggleButtonGroup.Separator />
        <PlotToolbarRichHint
          title="Reciprocal"
          description="Plot 1/s for the active I0, It, or Ie channel."
          placement="right"
          disabled={disabled}
        >
          <ToggleButton id="reciprocal" className={toggleClass}>
            1/s
          </ToggleButton>
        </PlotToolbarRichHint>
        <ToggleButtonGroup.Separator />
        <PlotToolbarRichHint
          title="Log reciprocal"
          description="Plot log10(1/s) for the active raw intensity channel."
          placement="right"
          disabled={disabled}
        >
          <ToggleButton id="log_reciprocal" className={toggleClass}>
            log
          </ToggleButton>
        </PlotToolbarRichHint>
      </ToggleButtonGroup>
    </Toolbar>
  );
}
