"use client";

/**
 * Prompt-style command block for Dev Docs.
 *
 * The leading `$` is display only. Copy writes `command` and leaves `output`
 * out, so a pasted line is runnable.
 */

import { Check, Copy } from "lucide-react";
import { useEffect, useRef, useState, type ReactElement } from "react";

/**
 * Renders a shell command with a copy control.
 *
 * @param props.command - Exact text placed on the clipboard.
 * @param props.output - Optional comment or sample output shown under the command. Not copied.
 */
export function DocsCommandBlock({
  command,
  output,
}: {
  command: string;
  output?: string;
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
    <div className="border-border bg-surface flex items-start gap-2 rounded-xl border px-3 py-2.5">
      <pre className="min-w-0 flex-1 overflow-x-auto py-0.5">
        <code className="text-foreground font-mono text-sm">
          <span className="text-muted select-none">$ </span>
          {command}
          {output ? (
            <>
              {"\n"}
              <span className="text-muted">{output}</span>
            </>
          ) : null}
        </code>
      </pre>
      <button
        type="button"
        aria-label={copied ? "Copied" : "Copy command"}
        className="text-muted hover:text-foreground shrink-0 rounded-md p-1"
        onClick={() => {
          void navigator.clipboard.writeText(command).then(() => {
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
    </div>
  );
}
