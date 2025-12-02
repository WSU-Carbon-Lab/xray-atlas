"use client";

import type { ReactNode } from "react";
import { Tooltip, Badge } from "@heroui/react";
import type { BadgeProps } from "@heroui/react";

interface ToggleIconButtonProps {
  icon: ReactNode;
  isActive: boolean;
  onClick: () => void;
  ariaLabel: string;
  className?: string;
  // Tooltip props
  tooltip?: {
    content: string;
    placement?: "top" | "bottom" | "left" | "right";
    offset?: number;
  };
  // Badge props
  badge?: {
    content: ReactNode;
    color?: BadgeProps["color"];
    size?: BadgeProps["size"];
    placement?: BadgeProps["placement"];
    shape?: BadgeProps["shape"];
    showOutline?: boolean;
    isInvisible?: boolean;
    classNames?: BadgeProps["classNames"];
  };
}

/**
 * Toggle icon button component with consistent styling matching browse page toggle buttons.
 * Shows gray background when active, transparent with hover when inactive.
 * Supports optional tooltip and badge.
 */
export function ToggleIconButton({
  icon,
  isActive,
  onClick,
  ariaLabel,
  className = "",
  tooltip,
  badge,
}: ToggleIconButtonProps) {
  const button = (
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

  // If badge is provided, wrap button with badge
  const buttonWithBadge = badge ? (
    <Badge
      content={badge.content}
      color={badge.color ?? "primary"}
      size={badge.size ?? "sm"}
      placement={badge.placement ?? "top-right"}
      shape={badge.shape ?? "rectangle"}
      showOutline={badge.showOutline ?? true}
      isInvisible={badge.isInvisible ?? false}
      classNames={badge.classNames}
    >
      {button}
    </Badge>
  ) : (
    button
  );

  // If tooltip is provided, wrap with tooltip
  if (tooltip) {
    return (
      <Tooltip
        content={tooltip.content}
        placement={tooltip.placement ?? "top"}
        offset={tooltip.offset ?? 8}
        classNames={{
          base: "bg-gray-900 text-white dark:bg-gray-700 dark:text-gray-100 px-3 py-2 rounded-lg shadow-lg mb-2",
        }}
      >
        {buttonWithBadge}
      </Tooltip>
    );
  }

  return buttonWithBadge;
}
