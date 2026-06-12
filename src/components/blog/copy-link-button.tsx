"use client";

import { LinkIcon } from "@heroicons/react/24/outline";
import { cn } from "@heroui/styles";
import { useCallback, useEffect, useRef, useState } from "react";
import type { ReactElement } from "react";

/**
 * Copies the current page URL to the clipboard and briefly confirms success.
 */
export function CopyLinkButton({
  className,
}: {
  className?: string;
}): ReactElement {
  const [copied, setCopied] = useState(false);
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (resetTimerRef.current) {
        clearTimeout(resetTimerRef.current);
      }
    };
  }, []);

  const handleCopy = useCallback(async () => {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      if (resetTimerRef.current) {
        clearTimeout(resetTimerRef.current);
      }
      resetTimerRef.current = setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch {
      setCopied(false);
    }
  }, []);

  return (
    <button
      type="button"
      onClick={() => {
        void handleCopy();
      }}
      className={cn(
        "text-muted hover:text-foreground inline-flex items-center gap-1.5 text-sm transition-colors",
        className,
      )}
      aria-live="polite"
    >
      <LinkIcon className="size-4 shrink-0" aria-hidden />
      {copied ? "Copied" : "Copy link"}
    </button>
  );
}
