import Link from "next/link";
import type { ReactElement } from "react";

/**
 * Renders post tags as chips linking to the blog index with tag filter hash prefill.
 */
export function BlogPostTagChips({
  tags,
}: {
  tags: string[];
}): ReactElement | null {
  if (tags.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {tags.map((tag) => (
        <Link
          key={tag}
          href={`/blog#tags=${encodeURIComponent(tag)}`}
          className="border-border bg-surface text-muted hover:text-accent hover:border-accent/40 rounded-full border px-3 py-1 text-sm font-medium no-underline transition-colors"
        >
          {tag}
        </Link>
      ))}
    </div>
  );
}
