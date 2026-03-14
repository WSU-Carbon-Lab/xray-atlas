"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Skeleton } from "@heroui/react";
import { GitHubIcon } from "../icons";
import { StarIcon } from "@heroicons/react/24/solid";

type GitHubStarsLinkProps = {
  repo?: string;
};

export function GitHubStarsLink({
  repo = "WSU-Carbon-Lab/xray-atlas",
}: GitHubStarsLinkProps) {
  const [stars, setStars] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch(`https://api.github.com/repos/${repo}`, {
          headers: { Accept: "application/vnd.github+json" },
          cache: "force-cache",
          next: {
            revalidate: 60 * 10,
          },
        });
        if (!res.ok) {
          if (!cancelled) setStars(2);
          return;
        }
        const data = (await res.json()) as { stargazers_count?: number };
        if (!cancelled)
          setStars(
            typeof data.stargazers_count === "number"
              ? data.stargazers_count
              : 2,
          );
      } catch {
        if (!cancelled) setStars(2);
      }
    }
    void load();
    const id = setInterval(() => {
      void load();
    }, 1000 * 60 * 10);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [repo]);

  return (
    <Link
      href={`https://github.com/${repo}`}
      className="border-border bg-surface text-foreground focus-visible:ring-accent inline-flex h-10 items-center gap-2 rounded-lg border px-3 transition-colors hover:bg-default focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
      target="_blank"
      rel="noopener noreferrer"
      aria-label="View repository on GitHub"
    >
      <GitHubIcon className="h-4 w-4 shrink-0" />
      {stars === null ? (
        <Skeleton className="h-4 w-4 rounded" />
      ) : (
        <span
          aria-label="GitHub stars"
          className="text-foreground inline-block w-4 text-sm tabular-nums"
        >
          {formatCompactStars(stars)}
        </span>
      )}
      <StarIcon className="h-4 w-4 shrink-0" />
    </Link>
  );
}

export default GitHubStarsLink;

function formatCompactStars(value: number): string {
  // Use compact notation with at most one decimal place, then ensure lowercase 'k'/'m'
  const formatter = new Intl.NumberFormat("en", {
    notation: "compact",
    maximumFractionDigits: 1,
  });
  const formatted = formatter.format(value);
  // Normalize suffix to lowercase for consistency with design (e.g., 2.3k)
  return formatted.replace(/K|M|B|T/g, (m) => m.toLowerCase());
}
