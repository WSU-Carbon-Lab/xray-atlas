import type { ComponentType, MouseEvent, SVGProps } from "react";
import Link from "next/link";
import { Chip } from "@heroui/react";
import { ChevronRightIcon } from "@heroicons/react/24/outline";
import { cn } from "@heroui/styles";

type SvgIcon = ComponentType<SVGProps<SVGSVGElement> & { className?: string }>;

const chipSurfaceClassName =
  "max-w-full cursor-pointer shadow-sm backdrop-blur-sm transition-opacity hover:opacity-90 dark:border dark:border-accent/55 dark:bg-accent/28 dark:shadow-md dark:backdrop-blur-none";

const chipLabelClassName = "text-accent dark:text-accent-foreground";

const chevronClassName =
  "shrink-0 text-accent opacity-75 dark:text-accent-foreground dark:opacity-90";

/**
 * Renders a pill-shaped accent navigation chip (leading icon, label, trailing chevron)
 * wrapped in a Next.js `Link` so the full control is keyboard- and pointer-activatable.
 */
export function AccentNavChip({
  href,
  label,
  icon: Icon,
  size = "md",
  className,
  linkClassName,
  onClick,
}: {
  href: string;
  label: string;
  icon: SvgIcon;
  size?: "sm" | "md";
  className?: string;
  linkClassName?: string;
  onClick?: (event: MouseEvent<HTMLAnchorElement>) => void;
}) {
  const iconSizeClass = size === "sm" ? "size-3.5" : "size-4";
  const chevronSizeClass = size === "sm" ? "size-3.5" : "size-4";

  return (
    <Link
      href={href}
      className={cn(
        "focus-visible:ring-accent inline-flex max-w-full rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        linkClassName,
      )}
      onClick={onClick}
    >
      <Chip
        variant="soft"
        color="accent"
        size={size}
        className={cn(chipSurfaceClassName, className)}
      >
        <Icon
          className={cn(iconSizeClass, "shrink-0", chipLabelClassName)}
          aria-hidden
        />
        <Chip.Label
          className={cn(
            "min-w-0 text-balance font-medium",
            size === "sm" && "text-[11px] leading-tight",
            chipLabelClassName,
          )}
        >
          {label}
        </Chip.Label>
        <ChevronRightIcon
          className={cn(chevronSizeClass, chevronClassName)}
          aria-hidden
        />
      </Chip>
    </Link>
  );
}
