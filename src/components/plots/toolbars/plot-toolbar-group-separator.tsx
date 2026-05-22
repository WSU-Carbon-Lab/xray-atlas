"use client";

import { Separator } from "@heroui/react";
import { cn } from "@heroui/styles";
import {
  plotToolbarGroupSeparatorHorizontalClass,
  plotToolbarGroupSeparatorVerticalClass,
} from "./plot-toolbar-chrome";

export type PlotToolbarGroupSeparatorProps = {
  /** `vertical` between horizontal groups; `horizontal` between vertical groups. */
  orientation: "horizontal" | "vertical";
  className?: string;
};

/**
 * Divider between tool **groups** on one attached plot rail. For splits inside a single
 * `ButtonGroup` / `ToggleButtonGroup`, use that group's `.Separator` child instead.
 */
export function PlotToolbarGroupSeparator({
  orientation,
  className,
}: PlotToolbarGroupSeparatorProps) {
  return (
    <Separator
      orientation={orientation}
      className={cn(
        orientation === "vertical"
          ? plotToolbarGroupSeparatorVerticalClass
          : plotToolbarGroupSeparatorHorizontalClass,
        className,
      )}
    />
  );
}
