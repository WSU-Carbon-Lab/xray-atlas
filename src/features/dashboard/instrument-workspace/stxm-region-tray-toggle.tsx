"use client";

import { ToggleButton } from "@heroui/react";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import {
  PlotToolbarRichHint,
  plotToolbarCompactGlyphToggleClass,
} from "~/components/plots/toolbars";

export type StxmRegionTrayToggleProps = {
  regionTrayOpen: boolean;
  onRegionTrayOpenChange: (open: boolean) => void;
  disabled?: boolean;
  /** Hint panel placement when the control sits on the plot edge vs inside the tray. */
  hintPlacement?: "left" | "right" | "top" | "bottom";
};

/**
 * Expands or collapses the STXM line-scan region editor tray.
 */
export function StxmRegionTrayToggle({
  regionTrayOpen,
  onRegionTrayOpenChange,
  disabled = false,
  hintPlacement = "right",
}: StxmRegionTrayToggleProps) {
  return (
    <PlotToolbarRichHint
      title={regionTrayOpen ? "Hide line scan" : "Show line scan"}
      description={
        regionTrayOpen
          ? "Collapse the line-scan heatmap and region list."
          : "Open the line-scan heatmap to add and adjust sample regions."
      }
      placement={hintPlacement}
      disabled={disabled}
    >
      <ToggleButton
        isIconOnly
        aria-label={
          regionTrayOpen
            ? "Hide line scan region editor"
            : "Show line scan region editor"
        }
        isSelected={regionTrayOpen}
        isDisabled={disabled}
        onChange={onRegionTrayOpenChange}
        className={plotToolbarCompactGlyphToggleClass}
      >
        {regionTrayOpen ? (
          <PanelLeftClose className="h-4 w-4" aria-hidden />
        ) : (
          <PanelLeftOpen className="h-4 w-4" aria-hidden />
        )}
      </ToggleButton>
    </PlotToolbarRichHint>
  );
}
