"use client";

import { ChevronDownIcon, PlusIcon } from "@heroicons/react/24/outline";
import { Accordion, Chip } from "@heroui/react";
import { InstrumentNewRowForm } from "./instrument-new-row-form";
import type { NewInstrumentsAccordionProps } from "./types";

export function NewInstrumentsAccordion({
  instruments,
  facilityId,
  onChange,
  onRemove,
}: NewInstrumentsAccordionProps) {
  if (instruments.length === 0) {
    return (
      <p className="text-muted py-2 text-sm">No new instruments added yet.</p>
    );
  }

  return (
    <Accordion
      allowsMultipleExpanded
      variant="surface"
      aria-label="New instruments to submit"
      className="border-border w-full rounded-lg border"
    >
      {instruments.map((instrument, index) => {
        const title =
          instrument.name.trim() || `New instrument ${index + 1}`;
        return (
          <Accordion.Item key={`new-${index}`} id={`new-${index}`}>
            <Accordion.Heading>
              <Accordion.Trigger className="flex w-full items-center gap-2 text-start">
                <PlusIcon className="text-accent h-4 w-4 shrink-0" />
                <span className="text-foreground min-w-0 flex-1 truncate text-sm font-medium">
                  {title}
                </span>
                <Chip
                  size="sm"
                  variant="soft"
                  color="accent"
                  className="shrink-0"
                >
                  New
                </Chip>
                <Accordion.Indicator className="text-muted shrink-0 [&>svg]:size-4">
                  <ChevronDownIcon className="h-4 w-4" />
                </Accordion.Indicator>
              </Accordion.Trigger>
            </Accordion.Heading>
            <Accordion.Panel>
              <Accordion.Body className="pt-0">
                <InstrumentNewRowForm
                  instrument={instrument}
                  facilityId={facilityId}
                  onChange={(field, value) => onChange(index, field, value)}
                  onRemove={() => onRemove(index)}
                />
              </Accordion.Body>
            </Accordion.Panel>
          </Accordion.Item>
        );
      })}
    </Accordion>
  );
}
