"use client";

import { useMemo } from "react";
import { CpuChipIcon } from "@heroicons/react/24/outline";
import { PopoverMenu, PopoverMenuContent } from "~/components/ui/popover-menu";
import { Tooltip } from "@heroui/react";

export type NexafsInstrumentOption = {
  id: string;
  name: string;
  facilityName: string | null;
};

export type NexafsInstrumentFilterDropdownProps = {
  instrumentId: string | undefined;
  instruments: NexafsInstrumentOption[];
  onInstrumentChange: (id: string | undefined) => void;
};

const triggerBase =
  "border-border bg-surface text-muted focus-visible:ring-accent flex h-12 max-w-[min(100%,200px)] min-h-12 shrink-0 cursor-pointer items-center gap-2 rounded-lg border px-3 transition-colors hover:bg-default hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2";

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
            <button
              {...triggerProps}
              type="button"
              aria-label={
                selectedDescription
                  ? `Instrument filter, ${selectedDescription} selected`
                  : "Filter by instrument"
              }
              aria-pressed={hasSelection}
              className={`${triggerBase} ${hasSelection ? "border-accent/40 bg-accent-soft text-accent hover:text-accent" : ""}`}
            >
              <CpuChipIcon
                className="h-5 w-5 shrink-0 stroke-[1.5] text-current"
                aria-hidden
              />
              <span className="text-sm font-medium">Instrument</span>
              <span className="sr-only">
                {isOpen ? "Close instrument filter" : "Open instrument filter"}
              </span>
            </button>
          )}
          renderContent={({ contentPositionClassName, contentProps, close }) => (
            <PopoverMenuContent
              {...contentProps}
              className={`${contentPositionClassName} max-h-[min(320px,50vh)] overflow-y-auto rounded-xl py-1`}
            >
              <div className="space-y-0.5 p-1" role="listbox" aria-label="Instrument">
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
