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
        className="ml-1.5 rounded-full text-muted transition-colors hover:text-accent focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-1"
        aria-label={`Tooltip: ${description}`}
      >
        <InformationCircleIcon className="h-4 w-4" />
      </button>
      {showTooltip && (
        <div className="absolute left-1/2 top-full z-[var(--z-dropdown)] mt-2 w-64 -translate-x-1/2 transform">
          <div className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground shadow-lg">
            <p className="whitespace-normal">{description}</p>
            <div className="absolute -top-1 left-1/2 h-2 w-2 -translate-x-1/2 rotate-45 bg-surface" />
          </div>
        </div>
      )}
    </div>
  );
}
