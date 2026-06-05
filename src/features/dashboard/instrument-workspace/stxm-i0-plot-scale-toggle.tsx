"use client";

import { ToggleButton, ToggleButtonGroup, Toolbar } from "@heroui/react";
import { cn } from "@heroui/styles";
import {
  PlotToolbarRichHint,
  plotToolbarAttachedToggleGroupHorizontalClass,
  plotToolbarAttachedToolbarHorizontalClass,
  plotToolbarGlyphToggleGroupItemHorizontalClass,
} from "~/components/plots/toolbars";
import type { StxmI0PlotScaleMode } from "~/lib/stxm/stxm-ingestion-display";

const toggleClass = cn(
  plotToolbarGlyphToggleGroupItemHorizontalClass,
  "h-7 min-w-7 w-auto px-2 text-[10px] font-medium",
);

export type StxmI0PlotScaleToggleProps = {
  mode: StxmI0PlotScaleMode;
  onModeChange: (mode: StxmI0PlotScaleMode) => void;
  disabled?: boolean;
};

/**
 * In-plot I0 signal scale toggle: linear mean signal, log10(I), or log10(1/I).
 */
export function StxmI0PlotScaleToggle({
  mode,
  onModeChange,
  disabled = false,
}: StxmI0PlotScaleToggleProps) {
  return (
    <Toolbar
      isAttached
      orientation="horizontal"
      aria-label="I0 signal Y scale"
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
          if (key === "linear" || key === "log_i" || key === "log_inv") {
            onModeChange(key);
          }
        }}
      >
        <PlotToolbarRichHint
          title="Linear"
          description="Plot mean detector counts on a linear axis."
          placement="right"
          disabled={disabled}
        >
          <ToggleButton id="linear" className={toggleClass}>
            Lin
          </ToggleButton>
        </PlotToolbarRichHint>
        <ToggleButtonGroup.Separator />
        <PlotToolbarRichHint
          title="Log I"
          description="Log10 axis for I0 or sample mean signal."
          placement="right"
          disabled={disabled}
        >
          <ToggleButton id="log_i" className={toggleClass}>
            log I
          </ToggleButton>
        </PlotToolbarRichHint>
        <ToggleButtonGroup.Separator />
        <PlotToolbarRichHint
          title="Log 1/I"
          description="Log10 axis for reciprocal izero mean (1/I0)."
          placement="right"
          disabled={disabled}
        >
          <ToggleButton id="log_inv" className={toggleClass}>
            log 1/I
          </ToggleButton>
        </PlotToolbarRichHint>
      </ToggleButtonGroup>
    </Toolbar>
  );
}
