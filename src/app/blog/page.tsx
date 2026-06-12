import type { Metadata } from "next";
import type { ReactElement } from "react";
import { BlogCategoryHero } from "~/components/blog/blog-category-hero";
import {
  FeaturedPostCard,
  GridPostCard,
} from "~/components/blog/blog-post-cards";
import { getBlogEntries } from "~/lib/content/blog-loader";

export const metadata: Metadata = {
  title: "Blog",
  description: "Announcements and engineering notes from the X-ray Atlas team.",
  alternates: {
    types: {
      "application/rss+xml": [
        { url: "/blog/rss.xml", title: "X-ray Atlas Blog" },
      ],
    },
  },
};

/**
 * Static blog index with masthead, featured newest post, and a grid of remaining entries.
 */
export default async function BlogIndexPage(): Promise<ReactElement> {
  const entries = await getBlogEntries();
  const published = entries.filter((entry) => !entry.frontmatter.draft);
  const [featured, ...rest] = published;

  return (
    <div className="mx-auto w-full max-w-5xl py-10">
      <BlogCategoryHero recentPosts={published} />

      {published.length === 0 ? (
        <p className="text-muted">No posts yet.</p>
      ) : (
        <div className="space-y-10">
          {featured ? <FeaturedPostCard entry={featured} /> : null}
          {rest.length > 0 ? (
            <div className="grid gap-6 sm:grid-cols-2">
              {rest.map((entry) => (
                <GridPostCard key={entry.slug} entry={entry} />
              ))}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
