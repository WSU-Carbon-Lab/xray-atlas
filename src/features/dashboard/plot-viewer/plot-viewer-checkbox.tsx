"use client";

import type { ReactNode } from "react";
import { Checkbox, Label } from "@heroui/react";
import { cn } from "@heroui/styles";

/** Visible unchecked border/surface styling for plot viewer facet and catalog checkboxes. */
export const plotViewerCheckboxControlClassName =
  "border-2 border-border bg-surface ring-offset-surface data-[selected=true]:border-accent data-[selected=true]:bg-accent data-[focus-visible=true]:ring-2 data-[focus-visible=true]:ring-accent";

export const plotViewerCheckboxIndicatorClassName = "text-accent-foreground";

export type PlotViewerCheckboxProps = {
  isSelected: boolean;
  onChange: () => void;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
};

/**
 * Plot viewer checkbox with high-contrast unchecked styling on dark dashboard surfaces.
 */
export function PlotViewerCheckbox({
  isSelected,
  onChange,
  children,
  className,
  contentClassName,
}: PlotViewerCheckboxProps) {
  return (
    <Checkbox
      isSelected={isSelected}
      onChange={onChange}
      className={className}
    >
      <Checkbox.Control className={plotViewerCheckboxControlClassName}>
        <Checkbox.Indicator className={plotViewerCheckboxIndicatorClassName} />
      </Checkbox.Control>
      <Checkbox.Content className={contentClassName}>{children}</Checkbox.Content>
    </Checkbox>
  );
}

export type PlotViewerCheckboxLabelProps = {
  children: ReactNode;
  className?: string;
};

/**
 * Standard label styling for plot viewer checkbox rows.
 */
export function PlotViewerCheckboxLabel({
  children,
  className,
}: PlotViewerCheckboxLabelProps) {
  return (
    <Label className={cn("text-sm leading-snug", className)}>{children}</Label>
  );
}
