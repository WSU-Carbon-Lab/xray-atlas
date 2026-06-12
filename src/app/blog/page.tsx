import type { Metadata } from "next";
import type { ReactElement } from "react";
import { BlogCategoryHero } from "~/components/blog/blog-category-hero";
import { BlogIndexFilteredSection } from "~/components/blog/blog-filtered-grid";
import {
  FeaturedPostCard,
  GridPostCard,
} from "~/components/blog/blog-post-cards";
import { BlogTeaserSection } from "~/components/blog/blog-teaser-section";
import {
  getPublishedBlogEntries,
  getTeaserEntries,
  topBlogTags,
} from "~/lib/content/blog-loader";

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
 * Static blog index with masthead, featured newest post, filterable grid, and teasers.
 */
export default async function BlogIndexPage(): Promise<ReactElement> {
  const [published, teasers] = await Promise.all([
    getPublishedBlogEntries(),
    getTeaserEntries(),
  ]);
  const [featured, ...rest] = published;
  const availableTags = topBlogTags(published);
  const gridMeta = rest.map((entry) => ({
    slug: entry.slug,
    category: entry.frontmatter.category,
    tags: entry.frontmatter.tags,
    date: entry.frontmatter.date,
  }));

  return (
    <div className="mx-auto w-full max-w-5xl py-10">
      <BlogCategoryHero recentPosts={published} />

      {published.length === 0 ? (
        <p className="text-muted">No posts yet.</p>
      ) : (
        <div className="space-y-10">
          {featured ? <FeaturedPostCard entry={featured} /> : null}
          {rest.length > 0 ? (
            <BlogIndexFilteredSection
              items={gridMeta}
              availableTags={availableTags}
            >
              {rest.map((entry) => (
                <GridPostCard key={entry.slug} entry={entry} />
              ))}
            </BlogIndexFilteredSection>
          ) : null}
        </div>
      )}

      <BlogTeaserSection teasers={teasers} />
    </div>
  );
}
