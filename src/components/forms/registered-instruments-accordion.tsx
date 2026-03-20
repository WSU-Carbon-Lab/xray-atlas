"use client";

import { ChevronDownIcon, WrenchScrewdriverIcon } from "@heroicons/react/24/outline";
import { Accordion, Chip } from "@heroui/react";
import { RegisteredInstrumentEditor } from "./registered-instrument-editor";
import { registeredInstrumentStatusPresentation } from "./instrument-status";
import type { RegisteredInstrumentsAccordionProps } from "./types";

export function RegisteredInstrumentsAccordion({
  items,
  facilityId,
  isListRefreshing,
  onInstrumentUpdated,
}: RegisteredInstrumentsAccordionProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-foreground text-sm font-semibold">
          Registered instruments ({items.length})
        </h3>
        {isListRefreshing ? (
          <span className="text-muted text-xs">Refreshing...</span>
        ) : null}
      </div>
      {items.length === 0 ? (
        <p className="text-muted text-sm">
          No instruments on file for this facility yet.
        </p>
      ) : (
        <div
          className="max-h-[min(32rem,70vh)] overflow-y-auto"
          role="presentation"
        >
          <Accordion
            allowsMultipleExpanded
            variant="surface"
            aria-label="Instruments already registered at this facility"
            className="border-border w-full rounded-lg border"
          >
            {items.map((inst) => {
              const st =
                "status" in inst && typeof inst.status === "string"
                  ? inst.status
                  : "active";
              const { label: statusLabel, chipColor } =
                registeredInstrumentStatusPresentation(st);
              return (
                <Accordion.Item key={inst.id} id={inst.id}>
                  <Accordion.Heading>
                    <Accordion.Trigger className="flex w-full items-center gap-2 text-start">
                      <WrenchScrewdriverIcon className="text-muted h-4 w-4 shrink-0" />
                      <span className="text-foreground min-w-0 flex-1 truncate text-sm font-medium">
                        {inst.name}
                      </span>
                      <Chip
                        size="sm"
                        variant="soft"
                        color={chipColor}
                        className="shrink-0 capitalize"
                      >
                        {statusLabel}
                      </Chip>
                      <Accordion.Indicator className="text-muted shrink-0 [&>svg]:size-4">
                        <ChevronDownIcon className="h-4 w-4" />
                      </Accordion.Indicator>
                    </Accordion.Trigger>
                  </Accordion.Heading>
                  <Accordion.Panel>
                    <Accordion.Body className="pt-0">
                      <RegisteredInstrumentEditor
                        embedded
                        facilityId={facilityId}
                        instrument={{
                          id: inst.id,
                          name: inst.name,
                          link:
                            "link" in inst && typeof inst.link === "string"
                              ? inst.link
                              : null,
                          status: st,
                        }}
                        onUpdated={onInstrumentUpdated}
                      />
                    </Accordion.Body>
                  </Accordion.Panel>
                </Accordion.Item>
              );
            })}
          </Accordion>
        </div>
      )}
    </div>
  );
}
