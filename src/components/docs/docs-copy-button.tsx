"use client";

/**
 * Copy control shared by the Dev Docs code and command blocks.
 *
 * Writes exactly `value`, with no prompt or line numbers, and shows a short
 * confirmation state without moving focus.
 */

import { Check, Copy } from "lucide-react";
import { useEffect, useRef, useState, type ReactElement } from "react";

/**
 * Renders an icon button that copies one string.
 *
 * @param props.value - Exact text placed on the clipboard.
 * @param props.label - Accessible action name, such as "Copy code".
 */
export function DocsCopyButton({
  value,
  label,
}: {
  value: string;
  label: string;
}): ReactElement {
  const [copied, setCopied] = useState(false);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current !== null) {
        window.clearTimeout(timer.current);
      }
    };
  }, []);

  return (
    <button
      type="button"
      aria-label={copied ? "Copied" : label}
      className="text-muted hover:text-foreground shrink-0 rounded-md p-1"
      onClick={() => {
        void navigator.clipboard.writeText(value).then(() => {
          setCopied(true);
          if (timer.current !== null) {
            window.clearTimeout(timer.current);
          }
          timer.current = window.setTimeout(() => {
            setCopied(false);
            timer.current = null;
          }, 2000);
        });
      }}
    >
      {copied ? (
        <Check className="size-4" aria-hidden />
      ) : (
        <Copy className="size-4" aria-hidden />
      )}
    </button>
  );
}
