"use client";

import { type ButtonHTMLAttributes, type ReactNode, type Ref } from "react";
import { cn } from "@heroui/styles";

/**
 * Shared trigger button primitive for browse filter popovers.
 *
 * Provides the consistent `h-12` border-surface-muted style used across all
 * browse filter dropdowns and accepts a `ref` that `PopoverMenu.renderTrigger`
 * needs for portal positioning.  Callers spread `triggerProps` from the render
 * prop directly onto this component.
 *
 * @param icon - Icon node rendered at fixed `h-5 w-5 stroke-[1.5]` size.
 * @param label - Static label shown when `active` is false.
 * @param activeLabel - When provided and `active` is true, replaces `label`.
 * @param active - Applies the accent active-ring styling and swaps to `activeLabel`.
 * @param ref - Forwarded to the underlying `<button>` for popover positioning.
 */
export interface BrowseFilterTriggerProps
  extends ButtonHTMLAttributes<HTMLButtonElement> {
  ref?: Ref<HTMLButtonElement>;
  icon: ReactNode;
  label: string;
  activeLabel?: string | null;
  active?: boolean;
}

export function BrowseFilterTrigger({
  ref,
  icon,
  label,
  activeLabel,
  active = false,
  className,
  children,
  ...rest
}: BrowseFilterTriggerProps) {
  return (
    <button
      type="button"
      ref={ref}
      {...rest}
      className={cn(
        "border-border bg-surface text-muted focus-visible:ring-accent flex h-12 min-h-12 shrink-0 cursor-pointer items-center gap-2 rounded-lg border px-3 transition-colors hover:bg-default hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
        active && "border-accent/40 bg-accent-soft text-accent hover:text-accent",
        className,
      )}
    >
      <span
        className="flex h-5 w-5 shrink-0 items-center justify-center text-current [&>svg]:h-5 [&>svg]:w-5 [&>svg]:stroke-[1.5]"
        aria-hidden
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1 truncate text-left text-sm font-medium">
        {active && activeLabel ? activeLabel : label}
      </span>
      {children}
    </button>
  );
}
