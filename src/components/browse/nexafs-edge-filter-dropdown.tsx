"use client";

import { BoltIcon } from "@heroicons/react/24/outline";
import { selectClasses } from "@/components/browse/browse-header";
import { Tooltip } from "@heroui/react";

export type NexafsEdgeOption = {
  id: string;
  targetatom: string;
  corestate: string;
};

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

  return (
    <Tooltip delay={0}>
      <Tooltip.Trigger
        className={`border-border bg-surface focus-within:ring-accent inline-flex h-12 max-w-[min(100%,200px)] min-h-12 shrink-0 items-center gap-2 rounded-lg border px-3 transition-colors hover:bg-default focus-within:ring-2 focus-within:ring-offset-2 ${hasSelection ? "border-accent/40 bg-accent/15" : ""}`}
        aria-label="X-ray absorption edge filter; hover for help"
      >
        <BoltIcon
          className={`h-5 w-5 shrink-0 stroke-[1.5] ${hasSelection ? "text-accent" : "text-muted"}`}
          aria-hidden
        />
        <select
          id="nexafs-edge-filter"
          value={edgeId ?? ""}
          onChange={(e) =>
            onEdgeChange(e.target.value === "" ? undefined : e.target.value)
          }
          className={`${selectClasses} text-foreground min-w-0 flex-1 cursor-pointer border-0 bg-transparent py-0 pl-0 shadow-none ring-0 focus:ring-0`}
          aria-label="Filter by absorption edge"
        >
          <option value="">Any edge</option>
          {edges.map((e) => {
            const label = `${e.targetatom} ${e.corestate}`;
            return (
              <option key={e.id} value={e.id}>
                {label}
              </option>
            );
          })}
        </select>
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
