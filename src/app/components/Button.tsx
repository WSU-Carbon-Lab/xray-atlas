"use client";

import { Button as HeroButton } from "@heroui/react";

/**
 * DefaultButton - Wrapper around HeroUI Button with consistent styling.
 *
 * Uses HeroUI semantic tokens for theming:
 * - border-default: Border color that adapts to theme
 * - text-foreground: Text color that adapts to theme
 * - bg-default-100: Hover background that adapts to theme
 *
 * This ensures the button automatically responds to theme changes without
 * needing dark: variants.
 */
type DefaultButtonProps = React.ComponentProps<typeof HeroButton>;

export function DefaultButton({
  children,
  className,
  ...props
}: DefaultButtonProps) {
  return (
    <HeroButton
      {...props}
      variant={props.variant ?? "primary"}
      size={props.size ?? "md"}
      className={`cursor-pointer border-default text-foreground flex h-8 items-center gap-2 rounded-lg border px-3 backdrop-blur-sm bg-white/80 dark:bg-gray-900/80 hover:bg-white/90 dark:hover:bg-gray-800/90 transition-all shadow-sm hover:shadow-md ${className ?? ""}`}
    >
      {children}
    </HeroButton>
  );
}
