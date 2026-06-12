import { site } from "~/app/brand";
import {
  BLOG_CATEGORIES,
  getBlogCategory,
  isBlogCategorySlug,
  type BlogCategorySlug,
} from "~/lib/content/blog-categories";
import { buildBlogRssXml } from "~/lib/content/blog-feed";
import { getBlogEntriesByCategory } from "~/lib/content/blog-loader";

export const dynamic = "force-static";

/**
 * Emits one static RSS route per registered blog category.
 */
export function generateStaticParams(): { category: BlogCategorySlug }[] {
  return BLOG_CATEGORIES.map((category) => ({ category: category.slug }));
}

/**
 * Serves a category-scoped RSS 2.0 feed for published posts in that category.
 */
export async function GET(
  _request: Request,
  context: { params: Promise<{ category: string }> },
): Promise<Response> {
  const { category: categoryParam } = await context.params;

  if (!isBlogCategorySlug(categoryParam)) {
    return new Response("Not found", { status: 404 });
  }

  const category = getBlogCategory(categoryParam)!;
  const published = await getBlogEntriesByCategory(category.slug);
  const channelLink = `${site.url}/blog/category/${category.slug}`;

  const xml = buildBlogRssXml({
    title: `X-ray Atlas Blog — ${category.label}`,
    link: channelLink,
    description: category.description,
    postLinkPrefix: `${site.url}/blog`,
    entries: published,
  });

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
    },
  });
}
