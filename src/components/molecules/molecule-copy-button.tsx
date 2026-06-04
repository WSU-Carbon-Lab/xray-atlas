"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Check, Copy } from "lucide-react";
import { Tooltip } from "@heroui/react";
import { cn } from "@heroui/styles";
import { COPIED_RESET_MS } from "./molecule-display-constants";

export type MoleculeCopyButtonProps = {
  text: string;
  label: string;
  copiedLabel: string | null;
  onCopy: (text: string, label: string) => void;
  className?: string;
  size?: "default" | "inline";
};

/**
 * Icon button that copies `text` and briefly shows a check affordance after copy.
 */
export function MoleculeCopyButton({
  text,
  label,
  copiedLabel,
  onCopy,
  className = "",
  size = "default",
}: MoleculeCopyButtonProps) {
  const isInline = size === "inline";
  const [showCheck, setShowCheck] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      e.stopPropagation();
      onCopy(text, label);
      setShowCheck(true);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        setShowCheck(false);
        timeoutRef.current = null;
      }, COPIED_RESET_MS);
    },
    [text, label, onCopy],
  );

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const isCopied = showCheck || copiedLabel === label;
  const iconClass = isInline ? "h-3.5 w-3.5 shrink-0" : "h-4 w-4 shrink-0";
  const transitionClass = "transition-opacity duration-200";

  return (
    <Tooltip delay={0}>
      <button
        type="button"
        onClick={handleClick}
        aria-label={isCopied ? "Copied" : `Copy ${label}`}
        className={cn(
          "focus-visible:ring-accent text-text-tertiary hover:bg-surface-2 hover:text-text-secondary inline-flex shrink-0 items-center justify-center transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1",
          isInline
            ? "rounded-md p-1.5"
            : "min-h-[44px] min-w-[44px] rounded-lg",
          className,
          isCopied && "pointer-events-auto opacity-100",
        )}
      >
        <span className="relative inline-flex items-center justify-center">
          <Copy
            className={cn(
              iconClass,
              transitionClass,
              isCopied
                ? "pointer-events-none opacity-0"
                : "opacity-100",
            )}
            aria-hidden
          />
          <Check
            className={cn(
              iconClass,
              "absolute shrink-0 text-success",
              transitionClass,
              isCopied
                ? "opacity-100"
                : "pointer-events-none opacity-0",
            )}
            aria-hidden
          />
        </span>
      </button>
      <Tooltip.Content placement="top">
        {isCopied ? "Copied!" : `Copy ${label}`}
      </Tooltip.Content>
    </Tooltip>
  );
}
