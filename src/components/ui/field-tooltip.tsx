"use client";

import { InformationCircleIcon } from "@heroicons/react/24/outline";
import { useState } from "react";

type FieldTooltipProps = {
  description: string;
};

export function FieldTooltip({ description }: FieldTooltipProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div className="relative inline-flex items-center">
      <button
        type="button"
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        onFocus={() => setShowTooltip(true)}
        onBlur={() => setShowTooltip(false)}
        className="text-muted hover:text-accent focus:ring-accent ml-1.5 rounded-full transition-colors focus:ring-2 focus:ring-offset-1 focus:outline-none"
        aria-label={`Tooltip: ${description}`}
      >
        <InformationCircleIcon className="h-4 w-4" />
      </button>
      {showTooltip && (
        <div className="absolute top-full left-1/2 z-[var(--z-dropdown)] mt-2 w-64 -translate-x-1/2 transform">
          <div className="border-border bg-surface text-foreground rounded-lg border px-3 py-2 text-sm shadow-lg">
            <p className="whitespace-normal">{description}</p>
            <div className="bg-surface absolute -top-1 left-1/2 h-2 w-2 -translate-x-1/2 rotate-45" />
          </div>
        </div>
      )}
    </div>
  );
}
