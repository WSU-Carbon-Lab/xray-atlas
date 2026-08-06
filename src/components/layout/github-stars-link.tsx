"use client";

import { Skeleton } from "@heroui/react";
import { cn } from "@heroui/styles";
import { StarIcon } from "@heroicons/react/24/solid";
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
  /**
   * `expandable` (default): icon-only until hover/focus reveals the star count.
   * `static`: always shows the expanded icon + star count (footer).
   */
  variant?: "expandable" | "static";
};

/**
 * Header/footer GitHub control linking to the Atlas repository with star count.
 *
 * Expandable chrome matches ThemeToggle (`h-10` surface border, `h-4` icon) and
 * reveals stars on hover. Static variant keeps the expanded layout always visible.
 * A slow accent comet orbits the border; the star icon twinkles in the callout.
 */
export function GitHubStarsLink({
  repo = XRAY_ATLAS_GITHUB_REPO,
  stars,
  variant = "expandable",
}: GitHubStarsLinkProps) {
  const countLabel =
    typeof stars === "number" ? formatCompactStars(stars) : null;
  const isStatic = variant === "static";

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
      className={cn(
        "github-stars-beacon group/star text-foreground",
        !isStatic && "github-stars-beacon--expandable",
        "relative inline-flex h-10 min-w-10 items-center overflow-hidden rounded-lg",
        "focus:outline-none focus-visible:ring-accent focus-visible:ring-2 focus-visible:ring-offset-2",
      )}
    >
      <span className="relative flex size-10 shrink-0 items-center justify-center">
        <GitHubIcon className="size-4" aria-hidden />
      </span>

      <span
        className={cn(
          "relative grid min-w-0",
          isStatic
            ? "grid-cols-[1fr]"
            : cn(
                "transition-[grid-template-columns] duration-300 ease-out",
                "motion-reduce:transition-none",
                "grid-cols-[0fr] group-hover/star:grid-cols-[1fr] group-focus-within/star:grid-cols-[1fr]",
                "[@media(hover:none)]:grid-cols-[1fr]",
              ),
        )}
      >
        <span className="min-w-0 overflow-hidden">
          <span
            className={cn(
              "border-border bg-default relative mr-2 flex items-center gap-1.5 rounded-md border px-2 py-1",
              "shadow-sm",
              isStatic
                ? "opacity-100"
                : cn(
                    "opacity-0 transition-opacity duration-300",
                    "group-hover/star:opacity-100 group-focus-within/star:opacity-100",
                    "[@media(hover:none)]:opacity-100",
                    "motion-reduce:transition-none",
                  ),
            )}
          >
            <span
              aria-hidden
              className="border-border absolute top-1/2 -left-[5px] size-0 -translate-y-1/2 border-y-[5px] border-r-[5px] border-y-transparent"
            />
            <span
              aria-hidden
              className="absolute top-1/2 -left-1 size-0 -translate-y-1/2 border-y-4 border-r-4 border-y-transparent border-r-[var(--default)]"
            />
            <StarIcon
              className="github-stars-star-twinkle text-accent size-3.5 shrink-0"
              aria-hidden
            />
            {stars === undefined ? (
              <Skeleton className="h-3.5 w-6 rounded" />
            ) : countLabel !== null ? (
              <span className="text-sm font-semibold tracking-tight tabular-nums">
                {countLabel}
              </span>
            ) : (
              <span className="text-muted text-sm tabular-nums">—</span>
            )}
          </span>
        </span>
      </span>
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
