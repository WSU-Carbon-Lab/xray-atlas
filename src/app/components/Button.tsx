"use client";

import { Button as HeroButton } from "@heroui/react";

type DefaultButtonProps = React.ComponentProps<typeof HeroButton>;

export function DefaultButton({
  children,
  className,
  ...props
}: DefaultButtonProps) {
  return (
    <HeroButton
      {...props}
      variant={props.variant ?? "light"}
      size={props.size ?? "md"}
      className={`cursor-pointer border-default-200 text-foreground dark:border-default-100/20 flex h-8 items-center gap-2 rounded-full border border-gray-300 dark:border-gray-600 px-3 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 ${className ?? ""}`}
    >
      {children}
    </HeroButton>
  );
}
