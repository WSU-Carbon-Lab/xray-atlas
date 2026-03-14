"use client";

import { selectClasses } from "@/components/browse/browse-header";

const OPTIONS = [12, 24, 48, 96] as const;

type ItemsPerPageSelectProps = {
  value: number;
  onChange: (value: number) => void;
  labelId?: string;
};

export function ItemsPerPageSelect({
  value,
  onChange,
  labelId = "items-per-page",
}: ItemsPerPageSelectProps) {
  return (
    <div className="flex items-center gap-2">
      <label
        htmlFor={labelId}
        className="text-muted text-sm font-medium"
      >
        Show:
      </label>
      <select
        id={labelId}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className={selectClasses}
        aria-label="Items per page"
      >
        {OPTIONS.map((n) => (
          <option key={n} value={n}>
            {n}
          </option>
        ))}
      </select>
      <span className="text-muted text-sm">per page</span>
    </div>
  );
}
