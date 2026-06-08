"use client";

import { ToggleButton } from "@heroui/react";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import {
  PlotToolbarRichHint,
  plotToolbarCompactGlyphToggleClass,
} from "~/components/plots/toolbars";

export type PlotViewerPanelToggleProps = {
  panelOpen: boolean;
  onPanelOpenChange: (open: boolean) => void;
};

/**
 * Expands or collapses the dashboard plot viewer dataset picker tray.
 */
export function PlotViewerPanelToggle({
  panelOpen,
  onPanelOpenChange,
}: PlotViewerPanelToggleProps) {
  return (
    <PlotToolbarRichHint
      title={panelOpen ? "Hide dataset picker" : "Show dataset picker"}
      description={
        panelOpen
          ? "Collapse the left catalog panel so the plot uses full width."
          : "Open the catalog picker to search facets and add datasets."
      }
      placement="right"
    >
      <ToggleButton
        isIconOnly
        aria-label={
          panelOpen
            ? "Hide dataset picker panel"
            : "Show dataset picker panel"
        }
        isSelected={panelOpen}
        onChange={onPanelOpenChange}
        className={plotToolbarCompactGlyphToggleClass}
      >
        {panelOpen ? (
          <PanelLeftClose className="h-4 w-4" aria-hidden />
        ) : (
          <PanelLeftOpen className="h-4 w-4" aria-hidden />
        )}
      </ToggleButton>
    </PlotToolbarRichHint>
  );
}
