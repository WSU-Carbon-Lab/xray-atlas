"use client";

import { useMemo } from "react";
import { BoltIcon } from "@heroicons/react/24/outline";
import { Tooltip } from "@heroui/react";
import { PopoverMenu, PopoverMenuContent } from "~/components/ui/popover-menu";
import { BrowseFilterTrigger } from "./browse-filter-trigger";

export type NexafsEdgeOption = {
  id: string;
  targetatom: string;
  corestate: string;
};

/**
 * Filter popover for restricting NEXAFS browse results to a specific absorption edge.
 *
 * @param edgeId - Currently selected edge UUID, or `undefined` for no filter.
 * @param edges - List of available edges to display in the panel.
 * @param onEdgeChange - Called with the selected edge UUID, or `undefined` to clear.
 */
export type NexafsEdgeFilterDropdownProps = {
  edgeId: string | undefined;
  edges: NexafsEdgeOption[];
  onEdgeChange: (id: string | undefined) => void;
};

export function NexafsEdgeFilterDropdown({
  edgeId,
  edges,
  onEdgeChange,
}: NexafsEdgeFilterDropdownProps) {
  const hasSelection = !!edgeId;

  const summaryLabel = useMemo(() => {
    if (!edgeId) return null;
    const e = edges.find((x) => x.id === edgeId);
    return e ? `${e.targetatom} ${e.corestate}` : "Edge";
  }, [edgeId, edges]);

  return (
    <Tooltip delay={0}>
      <Tooltip.Trigger className="inline-flex shrink-0">
        <PopoverMenu
          align="end"
          contentClassName="w-[260px]"
          renderTrigger={({ triggerProps, isOpen }) => (
            <BrowseFilterTrigger
              {...triggerProps}
              aria-label="Filter by absorption edge"
              aria-pressed={hasSelection}
              active={hasSelection}
              activeLabel={summaryLabel}
              icon={<BoltIcon aria-hidden />}
              label="Edge"
              className="max-w-[min(100%,200px)]"
            >
              <span className="sr-only">
                {isOpen ? "Close edge filter" : "Open edge filter"}
              </span>
            </BrowseFilterTrigger>
          )}
          renderContent={({ contentPositionClassName, contentProps, close }) => (
            <PopoverMenuContent
              {...contentProps}
              className={`${contentPositionClassName} max-h-[min(280px,50vh)] overflow-y-auto rounded-xl py-1`}
            >
              <div
                className="space-y-0.5 p-1"
                role="listbox"
                aria-label="Absorption edge"
              >
                <button
                  type="button"
                  onClick={() => {
                    onEdgeChange(undefined);
                    close();
                  }}
                  className={`focus-visible:ring-accent flex w-full rounded-md px-2.5 py-2 text-left text-sm transition-colors focus:outline-none focus-visible:ring-2 ${
                    !hasSelection
                      ? "bg-accent-soft text-foreground ring-accent/35 ring-1"
                      : "text-muted hover:bg-default hover:text-foreground"
                  }`}
                >
                  Any edge
                </button>
                {edges.map((e) => {
                  const label = `${e.targetatom} ${e.corestate}`;
                  const selected = e.id === edgeId;
                  return (
                    <button
                      key={e.id}
                      type="button"
                      role="option"
                      aria-selected={selected}
                      onClick={() => {
                        onEdgeChange(e.id);
                        close();
                      }}
                      className={`focus-visible:ring-accent flex w-full rounded-md px-2.5 py-2 text-left text-sm transition-colors focus:outline-none focus-visible:ring-2 ${
                        selected
                          ? "bg-accent-soft text-foreground ring-accent/35 ring-1"
                          : "text-muted hover:bg-default hover:text-foreground"
                      }`}
                    >
                      {label}
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
        Limit results to a specific X-ray absorption edge (element and core
        level).
      </Tooltip.Content>
    </Tooltip>
  );
}
