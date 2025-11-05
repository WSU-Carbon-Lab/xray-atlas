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
        className="ml-1.5 text-gray-400 hover:text-wsu-crimson focus:outline-none focus:ring-2 focus:ring-wsu-crimson focus:ring-offset-1 rounded-full transition-colors dark:text-gray-500 dark:hover:text-wsu-crimson"
        aria-label={`Tooltip: ${description}`}
      >
        <InformationCircleIcon className="h-4 w-4" />
      </button>
      {showTooltip && (
        <div className="absolute left-1/2 top-full z-50 mt-2 w-64 -translate-x-1/2 transform">
          <div className="rounded-lg bg-gray-900 px-3 py-2 text-sm text-white shadow-lg dark:bg-gray-700">
            <p className="whitespace-normal">{description}</p>
            <div className="absolute -top-1 left-1/2 h-2 w-2 -translate-x-1/2 rotate-45 bg-gray-900 dark:bg-gray-700" />
          </div>
        </div>
      )}
    </div>
  );
}
