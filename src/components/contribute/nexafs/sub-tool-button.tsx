"use client";

import { Tooltip } from "@heroui/react";
import type { ReactNode } from "react";

interface SubToolButtonProps {
  icon?: ReactNode;
  text?: string;
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
  text,
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
    "border-border bg-default text-muted shadow-sm";
  const inactiveClasses =
    "border-border bg-surface hover:bg-default text-foreground";
  const sizeClasses = iconOnly ? "w-10" : "flex-1";

  const content = text ? (
    <span className="text-base font-medium">{text}</span>
  ) : (
    icon
  );

  const button = (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={tooltip}
      className={`${baseClasses} ${sizeClasses} ${
        isActive ? activeClasses : inactiveClasses
      } ${className}`}
    >
      {content}
      {!iconOnly && label && <span className="text-xs">{label}</span>}
    </button>
  );

  return (
    <Tooltip delay={0}>
      {button}
      <Tooltip.Content
        placement="top"
        className="bg-foreground text-background rounded-lg px-3 py-2 shadow-lg"
      >
        {tooltip}
      </Tooltip.Content>
    </Tooltip>
  );
}
