/**
 * Copyable Python code block for Dev Docs.
 *
 * The snippet is highlighted once on the server with Shiki. The label is
 * optional and display only; a label with `href` links to the canonical source
 * file. Copy writes exactly `code`, with no prompt or line numbers, so a pasted
 * snippet is runnable.
 */

import type { ReactElement } from "react";
import { DocsCopyButton } from "~/components/docs/docs-copy-button";
import { highlightPython } from "~/lib/docs/highlight-python";

/**
 * Renders highlighted Python with a copy control.
 *
 * @param props.code - Exact Python source placed on the clipboard.
 * @param props.label - Optional caption such as a filename.
 * @param props.href - Optional source URL shown beside the caption.
 */
export async function DocsCodeBlock({
  code,
  label,
  href,
}: {
  code: string;
  label?: string;
  href?: string;
}): Promise<ReactElement> {
  const html = await highlightPython(code);

  return (
    <div className="border-border bg-surface overflow-hidden rounded-xl border">
      {label ? (
        <div className="border-border flex items-center justify-between gap-3 border-b px-3 py-1.5">
          <p className="text-muted truncate font-mono text-xs">{label}</p>
          {href ? (
            <a
              className="text-muted hover:text-foreground shrink-0 text-xs"
              href={href}
              rel="noopener noreferrer"
              target="_blank"
            >
              Source
            </a>
          ) : null}
        </div>
      ) : null}
      <div className="relative flex items-start gap-2 px-3 py-2.5">
        <div
          className="docs-code min-w-0 flex-1 overflow-x-auto py-0.5 pr-8"
          // Shiki output is generated from the repository's own source files.
          dangerouslySetInnerHTML={{ __html: html }}
        />
        <div className="absolute top-2 right-2">
          <DocsCopyButton label="Copy code" value={code} />
        </div>
      </div>
    </div>
  );
}
