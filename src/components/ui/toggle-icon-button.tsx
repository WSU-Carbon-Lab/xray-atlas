"use client";

import type { ComponentProps, ReactNode } from "react";
import { Badge, Tooltip } from "@heroui/react";

type BadgeOverlayProps = Pick<
  ComponentProps<typeof Badge>,
  "color" | "size" | "placement" | "className"
> & {
  content: ReactNode;
};

interface ToggleIconButtonProps {
  icon?: ReactNode;
  text?: string;
  label?: string;
  isActive: boolean;
  onClick: () => void;
  ariaLabel: string;
  className?: string;
  disabled?: boolean;
  tooltip?: {
    content: string;
    placement?: "top" | "bottom" | "left" | "right";
    offset?: number;
  };
  badge?: BadgeOverlayProps;
}

/**
 * Toggle icon button with optional HeroUI Tooltip and Badge (v3 `Badge.Anchor`).
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
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`rounded-lg border transition-colors ${
        disabled
          ? "cursor-not-allowed border-border bg-surface text-muted opacity-50"
          : isActive
            ? "border-accent bg-accent text-accent-foreground"
            : "border-border bg-surface text-foreground hover:bg-default"
      } ${className}`}
      aria-label={ariaLabel}
      aria-disabled={disabled}
    >
      {content}
    </button>
  );

  const buttonWithTooltip = tooltip ? (
    <Tooltip delay={0}>
      <Tooltip.Trigger className="inline-flex">{button}</Tooltip.Trigger>
      <Tooltip.Content
        placement={tooltip.placement ?? "top"}
        offset={tooltip.offset ?? 8}
        className="bg-foreground text-background mb-2 rounded-lg px-3 py-2 shadow-lg"
      >
        {tooltip.content}
      </Tooltip.Content>
    </Tooltip>
  ) : (
    button
  );

  if (badge) {
    return (
      <Badge.Anchor>
        {buttonWithTooltip}
        <Badge
          color={badge.color ?? "accent"}
          size={badge.size ?? "sm"}
          placement={badge.placement ?? "top-right"}
          className={badge.className}
        >
          {badge.content}
        </Badge>
      </Badge.Anchor>
    );
  }

  return buttonWithTooltip;
}
