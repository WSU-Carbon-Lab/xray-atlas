import type { ReactElement } from "react";
import { BLOG_CATEGORIES } from "~/lib/content/blog-categories";
import {
  getBlogFrontmatterIndex,
  isListableBlogEntry,
  type BlogFrontmatterIndexEntry,
} from "~/lib/content/blog-loader";
import {
  HomeNewsBoard,
  type HomeNewsCategoryRow,
  type HomeNewsItem,
} from "./home-news-board";

function toNewsItem(entry: BlogFrontmatterIndexEntry): HomeNewsItem {
  return {
    slug: entry.slug,
    title: entry.frontmatter.title,
    description: entry.frontmatter.description,
    date: entry.frontmatter.date,
    category: entry.frontmatter.category,
    authors: [...entry.frontmatter.authors],
    heroImage: entry.frontmatter.heroImage,
  };
}

/**
 * Home news stage body.
 *
 * Loads the published frontmatter index, keeps the three newest posts, and
 * pairs each category with its newest post. A missing Perspectives post is
 * filled by an unpublished draft on the board. The stage chrome is owned by
 * the home page.
 */
export async function HomeLatestPosts(): Promise<ReactElement> {
  const index = await getBlogFrontmatterIndex();
  const posts = index.filter(isListableBlogEntry);
  const latest = posts.slice(0, 3).map(toNewsItem);
  const newestByCategory = new Map<string, BlogFrontmatterIndexEntry>();
  for (const post of posts) {
    const category = post.frontmatter.category;
    if (!newestByCategory.has(category)) {
      newestByCategory.set(category, post);
    }
  }
  const categories: HomeNewsCategoryRow[] = BLOG_CATEGORIES.map((category) => {
    const post = newestByCategory.get(category.slug);
    return {
      slug: category.slug,
      label: category.label,
      post: post ? toNewsItem(post) : null,
    };
  });

  return <HomeNewsBoard latest={latest} categories={categories} />;
}
