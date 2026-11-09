"use client";

/**
 * Prompt-style command block for Dev Docs.
 *
 * The leading `$` is display only. Copy writes `command` and leaves `output`
 * out, so a pasted line is runnable.
 */

import type { ReactElement } from "react";
import { DocsCopyButton } from "~/components/docs/docs-copy-button";

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
      <DocsCopyButton label="Copy command" value={command} />
    </div>
  );
}
