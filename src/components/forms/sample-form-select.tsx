"use client";

import { Label, ListBox, Select } from "@heroui/react";
import { FieldTooltip } from "~/components/ui/field-tooltip";

export const sampleFormLabelClass =
  "mb-1.5 flex flex-wrap items-center gap-1 text-sm font-medium text-foreground";

export const sampleFormOptionalSuffix = (
  <span className="text-muted font-normal"> (optional)</span>
);

export const sampleFormSelectTriggerClass =
  "border-border bg-surface-2 min-h-[44px] w-full rounded-lg border shadow-none";

export const sampleFormSelectInsetTriggerClass =
  "border-border/40 bg-surface/60 min-h-[40px] w-full rounded-xl border shadow-none";

export const sampleFormSelectPopoverClass =
  "z-[var(--z-popover)] w-[var(--trigger-width)] !rounded-lg p-0";

export const sampleFormSelectListBoxClass = "w-full p-1";

export const sampleFormSelectListBoxItemClass = "!rounded-md px-2.5";

import {
  sampleFormInsetControlClass,
  sampleFormInsetLabelClass,
  sampleFormInsetRowClass,
  type SampleFormLayout,
} from "./sample-form-layout";

export type SampleFormSelectProps<T extends string> = {
  label: string;
  items: readonly T[];
  labels: Record<T, string>;
  selectedKey: T | undefined;
  onSelectionChange: (next: T | undefined) => void;
  disabled?: boolean;
  ariaLabel: string;
  tooltip?: string;
  optional?: boolean;
  placeholder?: string;
  layout?: SampleFormLayout;
};

/**
 * HeroUI select used across NEXAFS sample information and extended preparation fields.
 */
export function SampleFormSelect<T extends string>({
  label,
  items,
  labels,
  selectedKey,
  onSelectionChange,
  disabled = false,
  ariaLabel,
  tooltip,
  optional = false,
  placeholder = "Select an option",
  layout = "stacked",
}: SampleFormSelectProps<T>) {
  const selectControl = (
    <Select
      aria-label={ariaLabel}
      className={layout === "inset" ? sampleFormInsetControlClass : "min-w-0 w-full"}
      fullWidth
      placeholder={placeholder}
      selectedKey={selectedKey ?? null}
      variant="secondary"
      isDisabled={disabled}
      onSelectionChange={(key) => {
        if (key == null) {
          onSelectionChange(undefined);
          return;
        }
        onSelectionChange(String(key) as T);
      }}
    >
      {layout === "stacked" ? (
        <Label className={sampleFormLabelClass}>
          {label}
          {tooltip ? <FieldTooltip description={tooltip} /> : null}
          {optional ? sampleFormOptionalSuffix : null}
        </Label>
      ) : null}
      <Select.Trigger
        className={
          layout === "inset"
            ? sampleFormSelectInsetTriggerClass
            : sampleFormSelectTriggerClass
        }
      >
        <Select.Value />
        <Select.Indicator />
      </Select.Trigger>
      <Select.Popover className={sampleFormSelectPopoverClass}>
        <ListBox aria-label={ariaLabel} className={sampleFormSelectListBoxClass}>
          {items.map((item) => (
            <ListBox.Item
              id={item}
              key={item}
              textValue={labels[item]}
              className={sampleFormSelectListBoxItemClass}
            >
              {labels[item]}
              <ListBox.ItemIndicator />
            </ListBox.Item>
          ))}
        </ListBox>
      </Select.Popover>
    </Select>
  );

  if (layout === "inset") {
    return (
      <div className={sampleFormInsetRowClass}>
        <Label className={sampleFormInsetLabelClass}>
          {label}
          {tooltip ? <FieldTooltip description={tooltip} /> : null}
          {optional ? sampleFormOptionalSuffix : null}
        </Label>
        {selectControl}
      </div>
    );
  }

  return selectControl;
}
