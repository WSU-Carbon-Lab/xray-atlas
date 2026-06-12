import type { Metadata } from "next";
import type { ReactElement } from "react";
import { notFound } from "next/navigation";
import {
  BlogBreadcrumbs,
  blogCategoryBreadcrumbItems,
} from "~/components/blog/blog-breadcrumbs";
import { BlogCategoryHero } from "~/components/blog/blog-category-hero";
import { BlogCategoryFilteredSection } from "~/components/blog/blog-filtered-grid";
import {
  FeaturedPostCard,
  GridPostCard,
} from "~/components/blog/blog-post-cards";
import { BlogTeaserSection } from "~/components/blog/blog-teaser-section";
import {
  BLOG_CATEGORIES,
  blogCategoryRssHref,
  getBlogCategory,
  isBlogCategorySlug,
  type BlogCategorySlug,
} from "~/lib/content/blog-categories";
import {
  getBlogEntriesByCategory,
  getTeaserEntries,
  topBlogTags,
} from "~/lib/content/blog-loader";

interface BlogCategoryPageProps {
  params: Promise<{ category: string }>;
}

/**
 * Emits one static param per registered blog category.
 */
export function generateStaticParams(): { category: BlogCategorySlug }[] {
  return BLOG_CATEGORIES.map((category) => ({ category: category.slug }));
}

/**
 * Supplies category-scoped metadata and RSS autodiscovery for the index page.
 */
export async function generateMetadata({
  params,
}: BlogCategoryPageProps): Promise<Metadata> {
  const { category: categoryParam } = await params;
  if (!isBlogCategorySlug(categoryParam)) {
    return {};
  }

  const category = getBlogCategory(categoryParam)!;

  return {
    title: `${category.label} | Blog`,
    description: category.description,
    alternates: {
      canonical: `/blog/category/${category.slug}`,
      types: {
        "application/rss+xml": [
          {
            url: blogCategoryRssHref(category.slug),
            title: `X-ray Atlas Blog — ${category.label}`,
          },
        ],
      },
    },
  };
}

/**
 * Renders a category-scoped blog index with shared masthead, tag filtering, and teasers.
 */
export default async function BlogCategoryPage({
  params,
}: BlogCategoryPageProps): Promise<ReactElement> {
  const { category: categoryParam } = await params;

  if (!isBlogCategorySlug(categoryParam)) {
    notFound();
  }

  const category = getBlogCategory(categoryParam)!;
  const [published, allTeasers] = await Promise.all([
    getBlogEntriesByCategory(category.slug),
    getTeaserEntries(),
  ]);
  const teasers = allTeasers.filter(
    (entry) => entry.category === category.slug,
  );
  const [featured, ...rest] = published;
  const availableTags = topBlogTags(published);
  const gridMeta = rest.map((entry) => ({
    slug: entry.slug,
    category: entry.frontmatter.category,
    tags: entry.frontmatter.tags,
    date: entry.frontmatter.date,
  }));

  const now = new Date();

  return (
    <div className="mx-auto w-full max-w-5xl py-10">
      <BlogBreadcrumbs items={blogCategoryBreadcrumbItems(category.label)} />
      <BlogCategoryHero
        activeCategory={category.slug}
        recentPosts={published}
        now={now}
      />

      {published.length === 0 ? (
        <p className="text-muted">
          No {category.label.toLowerCase()} posts yet. Check back soon or browse
          the full blog.
        </p>
      ) : (
        <div className="space-y-10">
          {featured ? <FeaturedPostCard entry={featured} now={now} /> : null}
          {rest.length > 0 ? (
            <BlogCategoryFilteredSection
              items={gridMeta}
              availableTags={availableTags}
            >
              {rest.map((entry) => (
                <GridPostCard key={entry.slug} entry={entry} now={now} />
              ))}
            </BlogCategoryFilteredSection>
          ) : null}
        </div>
      )}

      <BlogTeaserSection teasers={teasers} />
    </div>
  );
}
