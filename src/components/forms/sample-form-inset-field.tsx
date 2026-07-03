"use client";

import { Label, TextField, InputGroup } from "@heroui/react";
import { FieldTooltip } from "~/components/ui/field-tooltip";
import {
  sampleFormOptionalSuffix,
} from "./sample-form-select";

import {
  sampleFormInsetControlClass,
  sampleFormInsetLabelClass,
  sampleFormInsetRowClass,
} from "./sample-form-layout";

const insetInputGroupClass =
  "border-border/40 bg-surface/60 shadow-none [&_[data-slot=input-group-input]]:text-[15px]";

export type SampleFormInsetTextRowProps = {
  name: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  tooltip?: string;
  optional?: boolean;
  type?: "text" | "number";
  min?: number;
  step?: number | string;
};

/**
 * Renders a text or number field as one row inside an inset grouped list.
 */
export function SampleFormInsetTextRow({
  name,
  label,
  value,
  onChange,
  placeholder,
  tooltip,
  optional = false,
  type = "text",
  min,
  step,
}: SampleFormInsetTextRowProps) {
  return (
    <div className={sampleFormInsetRowClass}>
      <Label className={sampleFormInsetLabelClass}>
        {label}
        {tooltip ? <FieldTooltip description={tooltip} /> : null}
        {optional ? sampleFormOptionalSuffix : null}
      </Label>
      <TextField
        name={name}
        value={value}
        onChange={onChange}
        variant="secondary"
        fullWidth
        className={sampleFormInsetControlClass}
      >
        <InputGroup variant="secondary" fullWidth className={insetInputGroupClass}>
          <InputGroup.Input
            type={type}
            placeholder={placeholder}
            min={min}
            step={step}
            className="rounded-xl"
          />
        </InputGroup>
      </TextField>
    </div>
  );
}
