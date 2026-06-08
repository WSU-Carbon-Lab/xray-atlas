"use client";

import { cn } from "@heroui/styles";
import { ChevronDownIcon } from "lucide-react";
import { PopoverMenu, PopoverMenuContent } from "~/components/ui/popover-menu";
import type { PlotViewerDescriptorField } from "./plot-viewer-legend";
import { PlotViewerStyleMappingControls } from "./plot-viewer-style-mapping-controls";
import type {
  PlotViewerLineDash,
  PlotViewerLineStyleBy,
  PlotViewerMarkerSymbol,
  PlotViewerPaletteId,
  PlotViewerStyleMappingField,
} from "./plot-viewer-trace-styles";

export type PlotViewerStyleOverrideRow = {
  value: string;
  label: string;
};

export type PlotViewerStyleMappingChipProps = {
  paletteId: PlotViewerPaletteId;
  colorBy: PlotViewerStyleMappingField;
  lineStyleBy: PlotViewerLineStyleBy;
  markerBy: PlotViewerStyleMappingField;
  descriptorFields: readonly PlotViewerDescriptorField[];
  lineOverrideRows: readonly PlotViewerStyleOverrideRow[];
  markerOverrideRows: readonly PlotViewerStyleOverrideRow[];
  lineDashOverrides: Readonly<Record<string, PlotViewerLineDash>>;
  markerOverrides: Readonly<Record<string, PlotViewerMarkerSymbol>>;
  onPaletteChange: (paletteId: PlotViewerPaletteId) => void;
  onColorByChange: (field: PlotViewerStyleMappingField) => void;
  onLineStyleByChange: (field: PlotViewerLineStyleBy) => void;
  onMarkerByChange: (field: PlotViewerStyleMappingField) => void;
  onToggleDescriptorField: (field: PlotViewerDescriptorField) => void;
  onLineDashOverrideChange: (
    fieldValue: string,
    lineDash: PlotViewerLineDash,
  ) => void;
  onMarkerOverrideChange: (
    fieldValue: string,
    markerSymbol: PlotViewerMarkerSymbol,
  ) => void;
};

/**
 * Popover trigger for global trace style encodings (also inlined in the style accordion).
 */
export function PlotViewerStyleMappingChip(props: PlotViewerStyleMappingChipProps) {
  const {
    paletteId,
    colorBy,
    lineStyleBy,
    markerBy,
    descriptorFields,
  } = props;
  const activeMappingCount =
    (colorBy !== "thetaPhi" ? 1 : 0) +
    (lineStyleBy !== "none" ? 1 : 0) +
    (markerBy !== "experiment" ? 1 : 0) +
    (paletteId !== "spectrum" ? 1 : 0);
  const triggerLabel =
    activeMappingCount > 0 || descriptorFields.length > 2
      ? `Style mapping (${activeMappingCount + 1})`
      : "Style mapping";

  return (
    <PopoverMenu
      placement="bottom-end"
      contentClassName="w-[min(100vw-2rem,320px)]"
      renderTrigger={({ triggerProps, isOpen }) => (
        <button
          type="button"
          {...triggerProps}
          aria-label="Configure trace style mapping"
          className={cn(
            "border-border bg-surface text-foreground hover:bg-default/40 focus-visible:ring-accent inline-flex h-8 shrink-0 cursor-pointer items-center gap-1 rounded-lg border px-2.5 text-xs transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
            (activeMappingCount > 0 || descriptorFields.length > 2) &&
              "border-accent/40 bg-accent-soft text-accent",
          )}
        >
          <span className="max-w-[11rem] truncate">{triggerLabel}</span>
          <ChevronDownIcon
            className={cn(
              "h-3.5 w-3.5 shrink-0 transition-transform",
              isOpen && "rotate-180",
            )}
            aria-hidden
          />
        </button>
      )}
      renderContent={({ contentPositionClassName, contentProps }) => (
        <PopoverMenuContent
          {...contentProps}
          className={cn(contentPositionClassName, "rounded-xl py-2")}
        >
          <div className="max-h-[min(70vh,28rem)] overflow-y-auto px-3 pb-1">
            <PlotViewerStyleMappingControls {...props} />
          </div>
        </PopoverMenuContent>
      )}
    />
  );
}
