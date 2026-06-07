"use client";

import { ToggleButton } from "@heroui/react";
import { ChevronsDownUp, ChevronsUpDown } from "lucide-react";
import {
  PlotToolbarRichHint,
  plotToolbarCompactGlyphToggleClass,
} from "~/components/plots/toolbars";

export type StxmPlotSplitToggleProps = {
  splitView: boolean;
  onSplitViewChange: (next: boolean) => void;
  disabled?: boolean;
};

/**
 * Right-rail split toggle matching NEXAFS linked optical / multi-trace stacked view.
 */
export function StxmPlotSplitToggle({
  splitView,
  onSplitViewChange,
  disabled = false,
}: StxmPlotSplitToggleProps) {
  return (
    <PlotToolbarRichHint
      title={splitView ? "Unsplit stacked plot" : "Split traces"}
      description={
        splitView
          ? "Overlay selected traces on one shared y-axis."
          : "Stack each trace on its own y-range sharing one energy axis."
      }
      placement="left"
      disabled={disabled}
    >
      <ToggleButton
        isIconOnly
        aria-label={
          splitView ? "Unsplit stacked spectroscopy plot" : "Split spectroscopy plot"
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
  );
}
