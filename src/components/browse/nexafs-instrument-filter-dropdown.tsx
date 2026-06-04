"use client";

import { useMemo } from "react";
import { CpuChipIcon } from "@heroicons/react/24/outline";
import { Tooltip } from "@heroui/react";
import { PopoverMenu, PopoverMenuContent } from "~/components/ui/popover-menu";
import { BrowseFilterTrigger } from "./browse-filter-trigger";

export type NexafsInstrumentOption = {
  id: string;
  name: string;
  facilityName: string | null;
};

/**
 * Filter popover for restricting NEXAFS browse results to a specific beamline or instrument.
 *
 * @param instrumentId - Currently selected instrument UUID, or `undefined` for no filter.
 * @param instruments - List of available instruments to display.
 * @param onInstrumentChange - Called with the selected instrument UUID, or `undefined` to clear.
 */
export type NexafsInstrumentFilterDropdownProps = {
  instrumentId: string | undefined;
  instruments: NexafsInstrumentOption[];
  onInstrumentChange: (id: string | undefined) => void;
};

function formatInstrumentLabel(inst: NexafsInstrumentOption): string {
  return inst.facilityName ? `${inst.name} (${inst.facilityName})` : inst.name;
}

export function NexafsInstrumentFilterDropdown({
  instrumentId,
  instruments,
  onInstrumentChange,
}: NexafsInstrumentFilterDropdownProps) {
  const hasSelection = !!instrumentId;

  const selectedDescription = useMemo(() => {
    if (!instrumentId) return null;
    const inst = instruments.find((i) => i.id === instrumentId);
    return inst ? formatInstrumentLabel(inst) : null;
  }, [instrumentId, instruments]);

  return (
    <Tooltip delay={0}>
      <Tooltip.Trigger className="inline-flex shrink-0">
        <PopoverMenu
          align="end"
          contentClassName="w-[min(100vw-2rem,320px)]"
          renderTrigger={({ triggerProps, isOpen }) => (
            <BrowseFilterTrigger
              {...triggerProps}
              aria-label={
                selectedDescription
                  ? `Instrument filter, ${selectedDescription} selected`
                  : "Filter by instrument"
              }
              aria-pressed={hasSelection}
              active={hasSelection}
              icon={<CpuChipIcon aria-hidden />}
              label="Instrument"
            >
              <span className="sr-only">
                {isOpen ? "Close instrument filter" : "Open instrument filter"}
              </span>
            </BrowseFilterTrigger>
          )}
          renderContent={({ contentPositionClassName, contentProps, close }) => (
            <PopoverMenuContent
              {...contentProps}
              className={`${contentPositionClassName} max-h-[min(320px,50vh)] overflow-y-auto rounded-xl py-1`}
            >
              <div
                className="space-y-0.5 p-1"
                role="listbox"
                aria-label="Instrument"
              >
                <button
                  type="button"
                  onClick={() => {
                    onInstrumentChange(undefined);
                    close();
                  }}
                  className={`focus-visible:ring-accent flex w-full rounded-md px-2.5 py-2 text-left text-sm transition-colors focus:outline-none focus-visible:ring-2 ${
                    !hasSelection
                      ? "bg-accent-soft text-foreground ring-accent/35 ring-1"
                      : "text-muted hover:bg-default hover:text-foreground"
                  }`}
                >
                  Any instrument
                </button>
                {instruments.map((inst) => {
                  const selected = inst.id === instrumentId;
                  return (
                    <button
                      key={inst.id}
                      type="button"
                      role="option"
                      aria-selected={selected}
                      onClick={() => {
                        onInstrumentChange(inst.id);
                        close();
                      }}
                      className={`focus-visible:ring-accent flex w-full rounded-md px-2.5 py-2 text-left text-sm transition-colors focus:outline-none focus-visible:ring-2 ${
                        selected
                          ? "bg-accent-soft text-foreground ring-accent/35 ring-1"
                          : "text-muted hover:bg-default hover:text-foreground"
                      }`}
                    >
                      {formatInstrumentLabel(inst)}
                    </button>
                  );
                })}
              </div>
            </PopoverMenuContent>
          )}
        />
      </Tooltip.Trigger>
      <Tooltip.Content
        placement="top"
        className="bg-foreground text-background max-w-xs rounded-lg px-3 py-2 text-left shadow-lg"
      >
        Limit results to spectra collected on a specific beamline or instrument.
      </Tooltip.Content>
    </Tooltip>
  );
}
