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
  variant = "primary",
  ...props
}: DefaultButtonProps) {
  const variantClasses =
    variant === "outline"
      ? "bg-surface hover:bg-default border-border"
      : "bg-accent text-accent-foreground border-accent hover:opacity-90";
  const baseClassName = `cursor-pointer flex h-8 items-center gap-2 rounded-lg border px-3 shadow-sm transition-[background-color,box-shadow] hover:shadow-md [touch-action:manipulation] border-border text-foreground ${variantClasses}`;

  const resolvedClassName = typeof className === "string" 
    ? `${baseClassName} ${className}` 
    : typeof className === "function"
      ? (renderProps: Parameters<typeof className>[0]) => {
          const custom = className(renderProps);
          return typeof custom === "string" ? `${baseClassName} ${custom}` : baseClassName;
        }
      : baseClassName;

  return (
    <HeroButton
      {...props}
      variant={variant}
      size={props.size ?? "md"}
      className={resolvedClassName}
    >
      {children}
    </HeroButton>
  );
}
