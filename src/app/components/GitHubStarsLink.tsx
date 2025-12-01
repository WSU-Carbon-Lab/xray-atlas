"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Skeleton } from "@heroui/react";
import { DefaultButton as Button } from "./Button";
import { GitHubIcon } from "./icons";
import { StarIcon } from "@heroicons/react/24/solid";

type GitHubStarsLinkProps = {
  repo?: string; // format: owner/name
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
            revalidate: 60 * 10, // 10 minutes
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
              : 2, // Default to 2 if stars are not returned
          );
      } catch {
        if (!cancelled) setStars(2); // Default to 2 on error
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
    <Button as={Link} href={`https://github.com/${repo}`}>
      <GitHubIcon className="h-4 w-4 text-gray-700 dark:text-gray-200" />
      {stars === null ? (
        <Skeleton className="h-4 w-4 rounded" />
      ) : (
        <span
          aria-label="GitHub stars"
          className="text-foreground-600 inline-block w-4 text-sm tabular-nums"
        >
          {formatCompactStars(stars)}
        </span>
      )}
      <StarIcon className="h-4 w-4 text-gray-700 dark:text-gray-200" />
    </Button>
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
