"use client";

import { selectClasses } from "@/components/browse/browse-header";
import { Tooltip } from "@heroui/react";

const OPTIONS = [12, 24, 48, 96] as const;

type ItemsPerPageSelectProps = {
  value: number;
  onChange: (value: number) => void;
  labelId?: string;
  compact?: boolean;
};

export function ItemsPerPageSelect({
  value,
  onChange,
  labelId = "items-per-page",
  compact = false,
}: ItemsPerPageSelectProps) {
  const control = (
    <div className="flex items-center gap-2">
      <label
        htmlFor={labelId}
        className={compact ? "sr-only" : "text-muted text-sm font-medium"}
      >
        {compact ? "Results per page" : "Show:"}
      </label>
      <select
        id={labelId}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className={`${selectClasses} ${compact ? "min-w-[4.5rem]" : ""}`}
        aria-label="Items per page"
      >
        {OPTIONS.map((n) => (
          <option key={n} value={n}>
            {n}
          </option>
        ))}
      </select>
      <span className={compact ? "sr-only" : "text-muted text-sm"}>
        per page
      </span>
    </div>
  );

  if (!compact) return control;

  return (
    <Tooltip delay={0}>
      {control}
      <Tooltip.Content
        placement="top"
        className="bg-foreground text-background max-w-xs rounded-lg px-3 py-2 text-left shadow-lg"
      >
        Number of dataset rows per page when browsing the list (not used during
        text search).
      </Tooltip.Content>
    </Tooltip>
  );
}
