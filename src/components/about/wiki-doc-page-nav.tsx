/**
 * Inline page navigation controls rendered at the top of every `/wiki/*` page.
 *
 * Exposes a "Copy page" action that copies the rendered wiki article HTML (and a plain
 * text fallback) from the `[data-wiki-main]` region to the system clipboard, and a paired
 * Previous / Next pair that walks {@link wikiDocPages} in reading order. Missing neighbors
 * are omitted at the ends of the wiki sequence so the home page only offers a `Next` jump
 * and the final API page only offers a `Previous` jump.
 */

"use client";

import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CheckIcon,
  Square2StackIcon,
} from "@heroicons/react/24/outline";
import { Button, Tooltip } from "@heroui/react";
import { cn } from "@heroui/styles";
import Link from "next/link";
import { useCallback, useEffect, useState, type ReactElement } from "react";
import { wikiDocPageNeighbors, type WikiDocPage } from "~/lib/wiki-doc-nav";

const wikiPageNavTooltipClass =
  "bg-foreground text-background rounded-lg px-3 py-2 text-sm shadow-lg";

const navIconButtonClass =
  "border-border bg-background text-foreground hover:bg-default focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 size-9 shrink-0 rounded-lg border inline-flex items-center justify-center transition-colors";

const COPY_FEEDBACK_MS = 1500;

interface WikiDocPageNavProps {
  /**
   * Current Next.js pathname (without query or hash). Used to derive previous and next
   * neighbors via {@link wikiDocPageNeighbors}.
   */
  pathname: string;
}

interface NeighborButtonProps {
  direction: "previous" | "next";
  page: WikiDocPage | undefined;
}

function NeighborButton({
  direction,
  page,
}: NeighborButtonProps): ReactElement | null {
  const isPrev = direction === "previous";
  const Icon = isPrev ? ArrowLeftIcon : ArrowRightIcon;
  const directionLabel = isPrev ? "Previous page" : "Next page";

  if (!page) {
    return null;
  }

  return (
    <Link
      aria-label={`${directionLabel}: ${page.label}`}
      className={navIconButtonClass}
      href={page.href}
      title={`${isPrev ? "Previous" : "Next"}: ${page.label}`}
    >
      <Icon className="size-4 shrink-0" aria-hidden />
      <span className="sr-only">{`${isPrev ? "Previous" : "Next"}: ${page.label}`}</span>
    </Link>
  );
}

function readWikiArticle(): { html: string; text: string } | null {
  if (typeof document === "undefined") {
    return null;
  }
  const article = document.querySelector<HTMLElement>("[data-wiki-main]");
  if (!article) {
    return null;
  }
  return {
    html: article.outerHTML,
    text: article.innerText.trim(),
  };
}

async function copyArticleToClipboard(): Promise<boolean> {
  const article = readWikiArticle();
  if (!article || article.html.length === 0) {
    return false;
  }

  const canWriteRich =
    typeof window !== "undefined" &&
    typeof navigator !== "undefined" &&
    typeof window.ClipboardItem !== "undefined" &&
    typeof navigator.clipboard?.write === "function";

  if (canWriteRich) {
    try {
      const item = new window.ClipboardItem({
        "text/html": new Blob([article.html], { type: "text/html" }),
        "text/plain": new Blob([article.text], { type: "text/plain" }),
      });
      await navigator.clipboard.write([item]);
      return true;
    } catch {
      // Fall through to plain-text fallbacks below.
    }
  }

  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(article.text);
      return true;
    } catch {
      // Fall through to legacy fallback below.
    }
  }

  if (typeof document === "undefined") {
    return false;
  }

  const textarea = document.createElement("textarea");
  textarea.value = article.text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "absolute";
  textarea.style.left = "-9999px";
  document.body.appendChild(textarea);
  textarea.select();
  let ok = false;
  try {
    ok = document.execCommand("copy");
  } catch {
    ok = false;
  }
  document.body.removeChild(textarea);
  return ok;
}

/**
 * Renders the Copy page / Previous / Next button cluster for a wiki page.
 *
 * Copy targets the `[data-wiki-main]` article element rendered by `WikiDocShell` and
 * writes both `text/html` and `text/plain` clipboard payloads when the modern Clipboard
 * API is available, falling back to plain text and ultimately a `document.execCommand`
 * textarea hop in non-secure contexts. Missing neighbors are omitted at the wiki sequence
 * ends so the home page has no `Previous` target and the final page has no `Next` target.
 *
 * @param props.pathname - Current pathname (no query or hash).
 */
export function WikiDocPageNav({
  pathname,
}: WikiDocPageNavProps): ReactElement {
  const { previous, next } = wikiDocPageNeighbors(pathname);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) {
      return;
    }
    const id = window.setTimeout(() => setCopied(false), COPY_FEEDBACK_MS);
    return () => window.clearTimeout(id);
  }, [copied]);

  const handleCopy = useCallback(async (): Promise<void> => {
    const ok = await copyArticleToClipboard();
    setCopied(ok);
  }, []);

  const CopyIcon = copied ? CheckIcon : Square2StackIcon;

  return (
    <nav
      className="flex shrink-0 items-center gap-2"
      aria-label="Page navigation"
    >
      <Tooltip delay={150}>
        <Button
          aria-label={copied ? "Page HTML copied" : "Copy page HTML"}
          className={cn(
            "h-9 gap-2 rounded-lg px-3 text-sm font-medium",
            copied && "border-accent bg-accent/15 text-accent",
          )}
          variant="outline"
          onPress={() => {
            void handleCopy();
          }}
        >
          <CopyIcon className="size-4 shrink-0" aria-hidden />
          <span className="hidden sm:inline">
            {copied ? "Copied" : "Copy Page"}
          </span>
        </Button>
        <Tooltip.Content className={wikiPageNavTooltipClass} placement="bottom">
          {copied ? "Page HTML copied to clipboard" : "Copy this page's HTML"}
        </Tooltip.Content>
      </Tooltip>
      {previous ? (
        <Tooltip delay={150}>
          <NeighborButton direction="previous" page={previous} />
          <Tooltip.Content
            className={wikiPageNavTooltipClass}
            placement="bottom start"
          >
            {`Previous: ${previous.label}`}
          </Tooltip.Content>
        </Tooltip>
      ) : null}
      {next ? (
        <Tooltip delay={150}>
          <NeighborButton direction="next" page={next} />
          <Tooltip.Content
            className={wikiPageNavTooltipClass}
            placement="bottom end"
          >
            {`Next: ${next.label}`}
          </Tooltip.Content>
        </Tooltip>
      ) : null}
    </nav>
  );
}
