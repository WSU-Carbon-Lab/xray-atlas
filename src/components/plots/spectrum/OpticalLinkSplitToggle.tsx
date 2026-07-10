"use client";

import { ToggleButton } from "@heroui/react";
import { ChevronsDownUp, ChevronsUpDown } from "lucide-react";
import {
  PlotToolbarRichHint,
  plotToolbarAttachedShellClass,
  plotToolbarCompactGlyphToggleClass,
} from "~/components/plots/toolbars";

export type OpticalLinkSplitToggleProps = {
  splitView: boolean;
  onSplitViewChange: (next: boolean) => void;
  disabled?: boolean;
};

/**
 * Toggles linked imaginary/real optical channels between one shared y-axis and stacked subplots.
 */
export function OpticalLinkSplitToggle({
  splitView,
  onSplitViewChange,
  disabled = false,
}: OpticalLinkSplitToggleProps) {
  return (
    <div className={plotToolbarAttachedShellClass}>
      <PlotToolbarRichHint
        title={splitView ? "Unsplit linked plot" : "Split imaginary and real"}
        description={
          splitView
            ? "Show imaginary and real channels on one shared y-axis."
            : "Stack imaginary (top) and real (bottom) with separate y-ranges on one energy axis."
        }
        placement="top"
        disabled={disabled}
      >
        <ToggleButton
          isIconOnly
          aria-label={
            splitView
              ? "Unsplit linked optical plot"
              : "Split linked optical plot"
          }
          isSelected={splitView}
          isDisabled={disabled}
          onChange={onSplitViewChange}
          className={plotToolbarCompactGlyphToggleClass}
        >
          {splitView ? (
            <ChevronsDownUp className="h-4 w-4" aria-hidden />
          ) : (
            <ChevronsUpDown className="h-4 w-4" aria-hidden />
          )}
        </ToggleButton>
      </PlotToolbarRichHint>
    </div>
  );
}
