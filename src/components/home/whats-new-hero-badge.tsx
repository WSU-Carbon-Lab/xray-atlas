"use client";

import type { ReactElement } from "react";
import Link from "next/link";
import { ArrowRightIcon, NewspaperIcon } from "@heroicons/react/24/outline";
import { cn } from "@heroui/styles";
import { formatBlogDate } from "~/lib/content/blog-date-format";
import type { WhatsNewSummary } from "~/lib/whats-new-summary";
import { useWhatsNewSeen } from "~/lib/whats-new-seen";

function truncateTitle(title: string, maxLength: number): string {
  if (title.length <= maxLength) {
    return title;
  }
  return `${title.slice(0, maxLength - 1).trimEnd()}…`;
}

/**
 * Secondary hero link to the latest What's New blog post; accent text and dot when unread.
 */
export function WhatsNewHeroBadge({
  summary,
}: {
  summary: WhatsNewSummary;
}): ReactElement {
  const { mounted, isUnread, markSeen } = useWhatsNewSeen(summary.date);
  const href = `/blog/${summary.slug}`;
  const truncatedTitle = truncateTitle(summary.title, 48);

  return (
    <Link
      href={href}
      onClick={markSeen}
      className={cn(
        "group focus-visible:ring-accent focus-visible:ring-offset-background inline-flex max-w-full min-w-0 items-center gap-1.5 rounded-sm text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
        mounted && isUnread
          ? "text-accent hover:text-accent/90"
          : "text-muted hover:text-foreground",
      )}
      aria-label={`What's New: ${summary.title}`}
    >
      <NewspaperIcon className="size-3.5 shrink-0 opacity-80" aria-hidden />
      <span className="min-w-0 truncate">
        <span className="font-medium">Blog</span>
        <span className="opacity-60" aria-hidden>
          {" · "}
        </span>
        <span className={mounted && isUnread ? "font-medium" : undefined}>
          {truncatedTitle}
        </span>
        <span className="opacity-60" aria-hidden>
          {" · "}
        </span>
        <span className="tabular-nums">
          {formatBlogDate(summary.date, { relative: true })}
        </span>
      </span>
      <ArrowRightIcon
        className="size-3.5 shrink-0 opacity-0 transition-opacity group-hover:opacity-70 group-focus-visible:opacity-70"
        aria-hidden
      />
      {mounted && isUnread ? (
        <span
          className="bg-accent size-1.5 shrink-0 rounded-full"
          aria-hidden
        />
      ) : null}
    </Link>
  );
}
