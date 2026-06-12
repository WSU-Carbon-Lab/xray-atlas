import Link from "next/link";
import type { ReactElement } from "react";
import { cn } from "@heroui/styles";
import type { BlogSeriesPartRow } from "~/lib/content/blog-series";

/**
 * Renders a series navigation box above the article body.
 */
export function BlogSeriesBox({
  seriesName,
  parts,
}: {
  seriesName: string;
  parts: BlogSeriesPartRow[];
}): ReactElement | null {
  if (parts.length === 0) {
    return null;
  }

  return (
    <aside
      aria-label={`${seriesName} series`}
      className="border-border bg-surface mb-8 rounded-xl border px-4 py-4"
    >
      <p className="text-accent text-xs font-semibold tracking-[0.16em] uppercase">
        Series
      </p>
      <p className="text-foreground mt-1 text-base font-semibold">
        {seriesName}
      </p>
      <ol className="mt-4 space-y-2 text-sm">
        {parts.map((part) => (
          <li key={part.part}>
            {part.isPublished && part.slug ? (
              <Link
                href={`/blog/${part.slug}`}
                className={cn(
                  "no-underline transition-colors",
                  part.isCurrent
                    ? "text-accent font-medium"
                    : "text-muted hover:text-accent",
                )}
                aria-current={part.isCurrent ? "page" : undefined}
              >
                <span className="text-muted mr-2 tabular-nums">
                  {part.part}.
                </span>
                {part.title}
              </Link>
            ) : (
              <span className="text-muted">
                <span className="mr-2 tabular-nums">{part.part}.</span>
                {part.title}
              </span>
            )}
          </li>
        ))}
      </ol>
    </aside>
  );
}
