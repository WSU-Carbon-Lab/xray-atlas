"use client";

import { Tooltip } from "@heroui/react";
import type { ReactNode } from "react";

interface SubToolButtonProps {
  icon: ReactNode;
  label?: string;
  tooltip: string;
  isActive?: boolean;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
  iconOnly?: boolean;
}

export function SubToolButton({
  icon,
  label,
  tooltip,
  isActive = false,
  onClick,
  disabled = false,
  className = "",
  iconOnly = false,
}: SubToolButtonProps) {
  const baseClasses =
    "flex h-10 items-center justify-center gap-1.5 rounded-lg border transition-colors disabled:cursor-not-allowed disabled:opacity-50";
  const activeClasses =
    "border-wsu-crimson bg-wsu-crimson text-white shadow-sm dark:border-wsu-crimson dark:bg-wsu-crimson dark:text-white";
  const inactiveClasses =
    "border-gray-300 bg-white hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:hover:bg-gray-600";
  const sizeClasses = iconOnly ? "w-10" : "flex-1";

  const button = (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`${baseClasses} ${sizeClasses} ${
        isActive ? activeClasses : inactiveClasses
      } ${className}`}
    >
      {icon}
      {!iconOnly && label && <span className="text-xs">{label}</span>}
    </button>
  );

  return (
    <Tooltip
      content={tooltip}
      placement="top"
      classNames={{
        base: "bg-gray-900 text-white dark:bg-gray-700 dark:text-gray-100 px-3 py-2 rounded-lg shadow-lg",
      }}
    >
      {button}
    </Tooltip>
  );
}
