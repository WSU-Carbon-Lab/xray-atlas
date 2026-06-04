"use client";

import type { ExperimentType } from "~/prisma/browser";
import { RectangleStackIcon } from "@heroicons/react/24/outline";
import { Tooltip } from "@heroui/react";
import { PopoverMenu, PopoverMenuContent } from "~/components/ui/popover-menu";
import { BrowseFilterTrigger } from "./browse-filter-trigger";
import { EXPERIMENT_TYPE_LABELS } from "./nexafs-browse-experiment-utils";
import { ACQUISITION_MODE_OPTIONS } from "./nexafs-filter-options";

/**
 * Filter popover for restricting NEXAFS browse results to a specific acquisition mode.
 *
 * @param experimentType - Currently selected `ExperimentType`, or `undefined` for no filter.
 * @param onExperimentTypeChange - Called with the selected type, or `undefined` to clear.
 */
export type NexafsAcquisitionFilterDropdownProps = {
  experimentType: ExperimentType | undefined;
  onExperimentTypeChange: (value: ExperimentType | undefined) => void;
};

export function NexafsAcquisitionFilterDropdown({
  experimentType,
  onExperimentTypeChange,
}: NexafsAcquisitionFilterDropdownProps) {
  const hasSelection = !!experimentType;
  const activeLabel =
    experimentType != null
      ? (EXPERIMENT_TYPE_LABELS[experimentType] ?? null)
      : null;

  return (
    <Tooltip delay={0}>
      <Tooltip.Trigger className="inline-flex shrink-0">
        <PopoverMenu
          align="end"
          contentClassName="w-[280px]"
          renderTrigger={({ triggerProps, isOpen }) => (
            <BrowseFilterTrigger
              {...triggerProps}
              aria-label="Filter by acquisition mode"
              aria-pressed={hasSelection}
              active={hasSelection}
              activeLabel={activeLabel}
              icon={<RectangleStackIcon aria-hidden />}
              label="Acquisition"
              className="max-w-[min(100%,220px)]"
            >
              <span className="sr-only">
                {isOpen
                  ? "Close acquisition filter"
                  : "Open acquisition filter"}
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
                aria-label="Acquisition mode"
              >
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
                {ACQUISITION_MODE_OPTIONS.map(([value, text]) => {
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
