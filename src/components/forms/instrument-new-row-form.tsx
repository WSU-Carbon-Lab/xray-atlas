"use client";

import { ExclamationTriangleIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { Button, Tooltip } from "@heroui/react";
import { InstrumentFieldsBlock } from "./instrument-fields-block";
import { useInstrumentNameAvailability } from "./use-instrument-name-availability";
import type { InstrumentNewRowFormProps } from "./types";

export function InstrumentNewRowForm({
  instrument,
  facilityId,
  onChange,
  onRemove,
}: InstrumentNewRowFormProps) {
  const checkData = useInstrumentNameAvailability({
    facilityId,
    name: instrument.name,
    mode: "new-row",
  });
  const instrumentExists = checkData.data?.exists ?? false;

  const duplicateWarning =
    instrumentExists && instrument.name.length > 0 ? (
      <div className="text-muted mt-2 flex items-center gap-2 text-sm">
        <ExclamationTriangleIcon className="h-4 w-4 shrink-0" aria-hidden />
        <span>This instrument already exists at this facility</span>
      </div>
    ) : null;

  return (
    <div className="space-y-4">
      <InstrumentFieldsBlock
        instrument={instrument}
        onChange={onChange}
        nameFieldName={`instrument-name-${instrument.name}`}
        linkFieldName={`instrument-link-${instrument.link}`}
        nameLabel="Instrument Name"
        linkLabel="Instrument Link (Optional)"
        nameInputGroupClassName={
          instrumentExists ? "border-warning/50 bg-warning/10" : undefined
        }
        duplicateWarning={duplicateWarning}
      />
      <div className="border-border flex justify-end border-t pt-4">
        <Tooltip delay={0}>
          <Button
            type="button"
            variant="ghost"
            size="md"
            onPress={onRemove}
            className="text-danger inline-flex items-center gap-2"
          >
            <XMarkIcon className="h-4 w-4 shrink-0" />
            <span>Remove row</span>
          </Button>
          <Tooltip.Content
            placement="top"
            className="bg-foreground text-background rounded-lg px-3 py-2 text-sm shadow-lg"
          >
            Remove this new instrument from the list
          </Tooltip.Content>
        </Tooltip>
      </div>
    </div>
  );
}
