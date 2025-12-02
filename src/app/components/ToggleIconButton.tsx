"use client";

import type { ReactNode } from "react";

interface ToggleIconButtonProps {
  icon: ReactNode;
  isActive: boolean;
  onClick: () => void;
  ariaLabel: string;
  className?: string;
}

/**
 * Toggle icon button component with consistent styling matching browse page toggle buttons.
 * Shows gray background when active, transparent with hover when inactive.
 */
export function ToggleIconButton({
  icon,
  isActive,
  onClick,
  ariaLabel,
  className = "",
}: ToggleIconButtonProps) {
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
