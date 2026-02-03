"use client";

import type { ReactNode } from "react";
import { Tooltip } from "@heroui/react";
import { Badge } from "@heroui/badge";
import type { BadgeProps } from "@heroui/badge";

interface ToggleIconButtonProps {
  icon?: ReactNode;
  text?: string;
  label?: string; // Text label to show alongside icon
  isActive: boolean;
  onClick: () => void;
  ariaLabel: string;
  className?: string;
  disabled?: boolean; // Disabled state for greyed out buttons
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
    className?: string;
  };
}

/**
 * Toggle icon button component with consistent styling matching browse page toggle buttons.
 * Shows gray background when active, transparent with hover when inactive.
 * Supports optional tooltip and badge.
 */
export function ToggleIconButton({
  icon,
  text,
  label,
  isActive,
  onClick,
  ariaLabel,
  className = "",
  disabled = false,
  tooltip,
  badge,
}: ToggleIconButtonProps) {
  const content = text ? (
    <span className="text-base font-medium">{text}</span>
  ) : label && icon ? (
    <span className="flex items-center gap-1.5">
      {icon}
      <span className="text-sm">{label}</span>
    </span>
  ) : (
    icon
  );

  const button = (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`rounded px-2 py-1.5 text-sm transition-colors ${
        disabled
          ? "cursor-not-allowed text-gray-400 opacity-50 dark:text-gray-500"
          : isActive
            ? "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300"
            : "text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
      } ${className}`}
      aria-label={ariaLabel}
      aria-disabled={disabled}
    >
      {content}
    </button>
  );

  // If tooltip is provided, wrap button with tooltip first
  const buttonWithTooltip = tooltip ? (
    <Tooltip delay={0}>
      {button}
      <Tooltip.Content
        placement={tooltip.placement ?? "top"}
        offset={tooltip.offset ?? 8}
        className="mb-2 rounded-lg bg-gray-900 px-3 py-2 text-white shadow-lg dark:bg-gray-700 dark:text-gray-100"
      >
        {tooltip.content}
      </Tooltip.Content>
    </Tooltip>
  ) : (
    button
  );

  // If badge is provided, wrap buttonWithTooltip with badge
  // Badge should not intercept pointer events so tooltip works correctly
  if (badge) {
    return (
      <Badge
        content={badge.content}
        color={badge.color ?? "primary"}
        size={badge.size ?? "sm"}
        placement={badge.placement ?? "top-right"}
        shape={badge.shape ?? "rectangle"}
        showOutline={badge.showOutline ?? true}
        isInvisible={badge.isInvisible ?? false}
        className={badge.className}
      >
        {buttonWithTooltip}
      </Badge>
    );
  }

  return buttonWithTooltip;
}
