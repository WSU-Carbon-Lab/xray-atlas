import type { Metadata } from "next";
import type { ReactElement } from "react";
import { notFound } from "next/navigation";
import { BlogCategoryHero } from "~/components/blog/blog-category-hero";
import {
  FeaturedPostCard,
  GridPostCard,
} from "~/components/blog/blog-post-cards";
import {
  BLOG_CATEGORIES,
  blogCategoryRssHref,
  getBlogCategory,
  isBlogCategorySlug,
  type BlogCategorySlug,
} from "~/lib/content/blog-categories";
import { getBlogEntriesByCategory } from "~/lib/content/blog-loader";

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
 * Renders a category-scoped blog index with shared masthead and post grid.
 */
export default async function BlogCategoryPage({
  params,
}: BlogCategoryPageProps): Promise<ReactElement> {
  const { category: categoryParam } = await params;

  if (!isBlogCategorySlug(categoryParam)) {
    notFound();
  }

  const category = getBlogCategory(categoryParam)!;
  const published = await getBlogEntriesByCategory(category.slug);
  const [featured, ...rest] = published;

  return (
    <div className="mx-auto w-full max-w-5xl py-10">
      <BlogCategoryHero
        activeCategory={category.slug}
        recentPosts={published}
      />

      {published.length === 0 ? (
        <p className="text-muted">
          No {category.label.toLowerCase()} posts yet. Check back soon or browse
          the full blog.
        </p>
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
