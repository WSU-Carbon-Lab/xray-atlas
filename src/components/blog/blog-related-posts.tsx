import type { ReactElement } from "react";
import { GridPostCard } from "~/components/blog/blog-post-cards";
import type { BlogEntry } from "~/lib/content/blog-loader";

/**
 * Renders up to two related post cards beneath the article when enough candidates exist.
 */
export function BlogRelatedPosts({
  posts,
}: {
  posts: BlogEntry[];
}): ReactElement | null {
  if (posts.length < 2) {
    return null;
  }

  return (
    <section aria-label="Related posts" className="mt-12 space-y-4">
      <h2 className="text-foreground text-lg font-semibold tracking-tight">
        Related posts
      </h2>
      <div className="grid gap-4 sm:grid-cols-2">
        {posts.map((entry) => (
          <GridPostCard key={entry.slug} entry={entry} />
        ))}
      </div>
    </section>
  );
}
