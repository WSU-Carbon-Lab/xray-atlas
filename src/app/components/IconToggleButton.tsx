"use client";

import type { ReactNode } from "react";

interface IconToggleButtonProps {
  icon: ReactNode;
  isActive: boolean;
  onClick: () => void;
  ariaLabel: string;
  className?: string;
}

/**
 * IconToggleButton - A reusable toggle button component for icon-only buttons
 * Matches the styling pattern used in the browse molecules view toggle
 */
export function IconToggleButton({
  icon,
  isActive,
  onClick,
  ariaLabel,
  className = "",
}: IconToggleButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`rounded px-3 py-1.5 text-sm transition-colors ${
        isActive
          ? "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300"
          : "text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
      } ${className}`}
      aria-label={ariaLabel}
    >
      {icon}
    </button>
  );
}
