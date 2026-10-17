"use client";

import { Skeleton } from "@heroui/react";
import Link from "next/link";
import { GitHubIcon } from "../icons";
import { XRAY_ATLAS_GITHUB_REPO } from "~/lib/github-beamline-issues";

type GitHubStarsLinkProps = {
  repo?: string;
  /**
   * Server-fetched stargazer count. `undefined` shows a loading skeleton
   * (Suspense fallback); `null` means the count was unavailable.
   */
  stars?: number | null;
};

/**
 * Single GitHub button with the star count beside the mark.
 *
 * The count stays visible. The control does not expand on hover.
 *
 * @param repo - `owner/name` repository path. Defaults to the Atlas repository.
 * @param stars - Stargazer count. `undefined` reserves a skeleton; `null` shows a hyphen.
 */
export function GitHubStarsLink({
  repo = XRAY_ATLAS_GITHUB_REPO,
  stars,
}: GitHubStarsLinkProps) {
  const countLabel =
    typeof stars === "number" ? formatCompactStars(stars) : null;

  return (
    <Link
      href={`https://github.com/${repo}`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={
        typeof stars === "number"
          ? `Star X-ray Atlas on GitHub (${stars} stars)`
          : "Star X-ray Atlas on GitHub"
      }
      className="text-foreground hover:text-foreground focus-visible:ring-accent inline-flex h-8 items-center gap-1 rounded-full px-1.5 text-sm focus:outline-none focus-visible:ring-2"
    >
      <GitHubIcon className="size-4 shrink-0" aria-hidden />
      {stars === undefined ? (
        <Skeleton className="h-3 w-3 rounded" />
      ) : (
        <span className="text-xs font-medium tabular-nums">
          {countLabel ?? "-"}
        </span>
      )}
    </Link>
  );
}

export default GitHubStarsLink;

function formatCompactStars(value: number): string {
  const formatter = new Intl.NumberFormat("en", {
    notation: "compact",
    maximumFractionDigits: 1,
  });
  const formatted = formatter.format(value);
  return formatted.replace(/K|M|B|T/g, (m) => m.toLowerCase());
}
