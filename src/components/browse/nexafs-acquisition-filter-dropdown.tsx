"use client";

import type { ExperimentType } from "~/prisma/browser";
import { RectangleStackIcon } from "@heroicons/react/24/outline";
import { PopoverMenu, PopoverMenuContent } from "~/components/ui/popover-menu";
import { Tooltip } from "@heroui/react";
import { EXPERIMENT_TYPE_LABELS } from "./nexafs-browse-experiment-utils";

export type NexafsAcquisitionFilterDropdownProps = {
  experimentType: ExperimentType | undefined;
  onExperimentTypeChange: (value: ExperimentType | undefined) => void;
};

const triggerBase =
  "border-border bg-surface text-muted focus-visible:ring-accent flex h-12 max-w-[min(100%,220px)] min-h-12 shrink-0 cursor-pointer items-center gap-2 rounded-lg border px-3 transition-colors hover:bg-default hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2";

const MODES = Object.entries(EXPERIMENT_TYPE_LABELS) as Array<
  [ExperimentType, string]
>;

export function NexafsAcquisitionFilterDropdown({
  experimentType,
  onExperimentTypeChange,
}: NexafsAcquisitionFilterDropdownProps) {
  const hasSelection = !!experimentType;
  const label =
    experimentType != null
      ? (EXPERIMENT_TYPE_LABELS[experimentType] ?? "Acquisition")
      : "Acquisition";

  return (
    <Tooltip delay={0}>
      <Tooltip.Trigger className="inline-flex shrink-0">
        <PopoverMenu
          align="end"
          contentClassName="w-[280px]"
          renderTrigger={({ triggerProps, isOpen }) => (
            <button
              {...triggerProps}
              type="button"
              aria-label="Filter by acquisition mode"
              aria-pressed={hasSelection}
              className={`${triggerBase} ${hasSelection ? "border-accent/40 bg-accent-soft text-accent hover:text-accent" : ""}`}
            >
              <RectangleStackIcon
                className="h-5 w-5 shrink-0 stroke-[1.5] text-current"
                aria-hidden
              />
              <span className="min-w-0 flex-1 truncate text-left text-sm font-medium">
                {label}
              </span>
              <span className="sr-only">
                {isOpen ? "Close acquisition filter" : "Open acquisition filter"}
              </span>
            </button>
          )}
          renderContent={({ contentPositionClassName, contentProps, close }) => (
            <PopoverMenuContent
              {...contentProps}
              className={`${contentPositionClassName} max-h-[min(320px,50vh)] overflow-y-auto rounded-xl py-1`}
            >
              <div className="space-y-0.5 p-1" role="listbox" aria-label="Acquisition mode">
                <button
                  type="button"
                  onClick={() => {
                    onExperimentTypeChange(undefined);
                    close();
                  }}
                  className={`focus-visible:ring-accent flex w-full rounded-md px-2.5 py-2 text-left text-sm transition-colors focus:outline-none focus-visible:ring-2 ${
                    !hasSelection
                      ? "bg-accent-soft text-foreground ring-accent/35 ring-1"
                      : "text-muted hover:bg-default hover:text-foreground"
                  }`}
                >
                  Any mode
                </button>
                {MODES.map(([value, text]) => {
                  const selected = value === experimentType;
                  return (
                    <button
                      key={value}
                      type="button"
                      role="option"
                      aria-selected={selected}
                      onClick={() => {
                        onExperimentTypeChange(value);
                        close();
                      }}
                      className={`focus-visible:ring-accent flex w-full rounded-md px-2.5 py-2 text-left text-sm transition-colors focus:outline-none focus-visible:ring-2 ${
                        selected
                          ? "bg-accent-soft text-foreground ring-accent/35 ring-1"
                          : "text-muted hover:bg-default hover:text-foreground"
                      }`}
                    >
                      {text}
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
        Filter by how the spectrum was acquired (e.g. TEY, PEY, transmission).
      </Tooltip.Content>
    </Tooltip>
  );
}
