"use client";

import {
  InputGroup,
  Label as HeroLabel,
  ListBox,
  Select,
  TextField,
} from "@heroui/react";
import { FieldTooltip } from "~/components/ui/field-tooltip";
import { INSTRUMENT_STATUS_OPTIONS } from "./constants";
import type { InstrumentFieldsBlockProps, InstrumentStatus } from "./types";

export function InstrumentFieldsBlock({
  instrument,
  onChange,
  nameFieldName,
  linkFieldName,
  nameLabel,
  linkLabel,
  namePlaceholder = "e.g., Beamline 7.3.3",
  nameInputGroupClassName,
  duplicateWarning,
  statusListboxLabel = "Instrument status",
  nameFieldTooltip = "Instrument commonly used name or designation",
  linkFieldTooltip = "Optional URL to the instrument documentation or facility page",
  statusFieldTooltip = "Instrument operating status",
}: InstrumentFieldsBlockProps) {
  return (
    <div className="space-y-4">
      <div className="relative">
        <TextField
          name={nameFieldName}
          value={instrument.name}
          onChange={(value) => onChange("name", value)}
          isRequired
          variant="secondary"
          fullWidth
        >
          <HeroLabel className="text-foreground mb-1.5 flex items-center gap-1 text-sm font-medium">
            {nameLabel}{" "}
            <span className="text-danger" aria-hidden>
              *
            </span>
            <span className="sr-only">(required)</span>
            <FieldTooltip description={nameFieldTooltip} />
          </HeroLabel>
          <InputGroup
            variant="secondary"
            fullWidth
            className={nameInputGroupClassName}
          >
            <InputGroup.Input placeholder={namePlaceholder} />
          </InputGroup>
        </TextField>
        {duplicateWarning}
      </div>

      <TextField
        name={linkFieldName}
        value={instrument.link}
        onChange={(value) => onChange("link", value)}
        variant="secondary"
        fullWidth
      >
        <HeroLabel className="text-foreground mb-1.5 block text-sm font-medium">
          {linkLabel}
          <FieldTooltip description={linkFieldTooltip} />
        </HeroLabel>
        <InputGroup variant="secondary" fullWidth>
          <InputGroup.Input type="url" placeholder="https://..." />
        </InputGroup>
      </TextField>

      <Select
        className="w-full"
        value={instrument.status}
        onChange={(value) => {
          if (value == null) return;
          onChange(
            "status",
            String(Array.isArray(value) ? value[0] : value) as InstrumentStatus,
          );
        }}
      >
        <HeroLabel className="text-foreground mb-1.5 flex items-center gap-1 text-sm font-medium">
          Status
          <FieldTooltip description={statusFieldTooltip} />
        </HeroLabel>
        <Select.Trigger className="border-border bg-surface-2 min-h-[44px] w-full rounded-lg border shadow-none">
          <Select.Value />
          <Select.Indicator />
        </Select.Trigger>
        <Select.Popover>
          <ListBox aria-label={statusListboxLabel} className="w-full">
            {INSTRUMENT_STATUS_OPTIONS.map((option) => (
              <ListBox.Item
                key={option.value}
                id={option.value}
                textValue={option.label}
                className="text-sm"
              >
                {option.label}
              </ListBox.Item>
            ))}
          </ListBox>
        </Select.Popover>
      </Select>
    </div>
  );
}
