"use client";

import { useEffect, useState } from "react";
import type { ExperimentType } from "~/prisma/browser";
import { Label, ListBox, Select, Button, Tooltip } from "@heroui/react";
import { SimpleDialog } from "~/components/ui/dialog";
import {
  CheckIcon,
  TrashIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";

export type NexafsBrowseRefineInstrument = {
  id: string;
  name: string;
  facilityName: string | null;
};

export type NexafsBrowseRefineDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  instrumentId: string | undefined;
  experimentType: ExperimentType | undefined;
  experimentTypeLabels: Record<ExperimentType, string>;
  instruments: NexafsBrowseRefineInstrument[];
  onApply: (next: {
    instrumentId: string | undefined;
    experimentType: ExperimentType | undefined;
  }) => void;
};

const ALL = "__all__";

export function NexafsBrowseRefineDialog({
  isOpen,
  onClose,
  instrumentId,
  experimentType,
  experimentTypeLabels,
  instruments,
  onApply,
}: NexafsBrowseRefineDialogProps) {
  const [draftInstrument, setDraftInstrument] = useState<string>(ALL);
  const [draftType, setDraftType] = useState<string>(ALL);

  useEffect(() => {
    if (!isOpen) return;
    setDraftInstrument(instrumentId ?? ALL);
    setDraftType(experimentType ?? ALL);
  }, [isOpen, instrumentId, experimentType]);

  const handleApply = () => {
    onApply({
      instrumentId: draftInstrument === ALL ? undefined : draftInstrument,
      experimentType:
        draftType === ALL ? undefined : (draftType as ExperimentType),
    });
    onClose();
  };

  const handleClearInDialog = () => {
    setDraftInstrument(ALL);
    setDraftType(ALL);
  };

  const experimentTypes = Object.keys(experimentTypeLabels) as ExperimentType[];

  return (
    <SimpleDialog
      isOpen={isOpen}
      onClose={onClose}
      title="More filters"
      maxWidth="max-w-md"
    >
      <p className="text-muted mb-4 text-sm">
        Optional filters for instrument and acquisition mode. Use the header
        for molecule and edge, and the search field for free-text matching.
      </p>
      <div className="space-y-5">
        <Tooltip delay={0}>
          <div className="space-y-1">
            <Select
              placeholder="Any instrument"
              value={draftInstrument === ALL ? null : draftInstrument}
              onChange={(value) => {
                const v =
                  value == null
                    ? ALL
                    : String(Array.isArray(value) ? value[0] : value);
                setDraftInstrument(v || ALL);
              }}
            >
              <Label htmlFor="refine-instrument-select">Instrument</Label>
              <Select.Trigger
                id="refine-instrument-select"
                className="min-h-[44px]"
              >
                <Select.Value />
                <Select.Indicator />
              </Select.Trigger>
              <Select.Popover className="max-h-72">
                <ListBox aria-label="Instruments">
                  <ListBox.Item key={ALL} textValue="Any instrument">
                    Any instrument
                  </ListBox.Item>
                  {instruments.map((inst) => {
                    const label = inst.facilityName
                      ? `${inst.name} (${inst.facilityName})`
                      : inst.name;
                    return (
                      <ListBox.Item key={inst.id} textValue={label}>
                        {label}
                      </ListBox.Item>
                    );
                  })}
                </ListBox>
              </Select.Popover>
            </Select>
          </div>
          <Tooltip.Content
            placement="right"
            className="bg-foreground text-background max-w-xs rounded-lg px-3 py-2 text-left shadow-lg"
          >
            Restrict to data from a specific registered instrument (often a
            beamline or endstation).
          </Tooltip.Content>
        </Tooltip>

        <Tooltip delay={0}>
          <div className="space-y-1">
            <Select
              placeholder="Any mode"
              value={draftType === ALL ? null : draftType}
              onChange={(value) => {
                const v =
                  value == null
                    ? ALL
                    : String(Array.isArray(value) ? value[0] : value);
                setDraftType(v || ALL);
              }}
            >
              <Label htmlFor="refine-type-select">Acquisition mode</Label>
              <Select.Trigger id="refine-type-select" className="min-h-[44px]">
                <Select.Value />
                <Select.Indicator />
              </Select.Trigger>
              <Select.Popover>
                <ListBox aria-label="Acquisition modes">
                  <ListBox.Item key={ALL} textValue="Any mode">
                    Any mode
                  </ListBox.Item>
                  {experimentTypes.map((t) => (
                    <ListBox.Item key={t} textValue={experimentTypeLabels[t]}>
                      {experimentTypeLabels[t]}
                    </ListBox.Item>
                  ))}
                </ListBox>
              </Select.Popover>
            </Select>
          </div>
          <Tooltip.Content
            placement="right"
            className="bg-foreground text-background max-w-xs rounded-lg px-3 py-2 text-left shadow-lg"
          >
            Restrict to experiments collected in a specific yield or
            transmission geometry (TEY, PEY, fluorescence, etc.).
          </Tooltip.Content>
        </Tooltip>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-end gap-2 border-t border-border pt-4">
        <Button variant="ghost" size="sm" onPress={handleClearInDialog}>
          <TrashIcon className="h-4 w-4" aria-hidden />
          Reset fields
        </Button>
        <Button variant="ghost" size="sm" onPress={onClose}>
          <XMarkIcon className="h-4 w-4" aria-hidden />
          Cancel
        </Button>
        <Button size="sm" onPress={handleApply}>
          <CheckIcon className="h-4 w-4" aria-hidden />
          Apply
        </Button>
      </div>
    </SimpleDialog>
  );
}
