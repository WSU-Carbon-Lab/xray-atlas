import { unstable_cache } from "next/cache";
import {
  getBlogEntries,
  getLatestReleasePost,
  isListableBlogEntry,
} from "~/lib/content/blog-loader";

/** Serializable highlight post for What's New surfaces (hero pill and account menu). */
export interface WhatsNewSummary {
  slug: string;
  title: string;
  date: string;
}

/**
 * Resolves the post highlighted in What's New UI: newest `releases` category post,
 * or the newest published post when no release-category post exists.
 */
export async function getWhatsNewSummary(): Promise<WhatsNewSummary | null> {
  try {
    const releasePost = await getLatestReleasePost();
    if (releasePost) {
      return {
        slug: releasePost.slug,
        title: releasePost.frontmatter.title,
        date: releasePost.frontmatter.date,
      };
    }

    const entries = await getBlogEntries();
    const latestPost = entries.find(isListableBlogEntry);
    if (!latestPost) {
      return null;
    }

    return {
      slug: latestPost.slug,
      title: latestPost.frontmatter.title,
      date: latestPost.frontmatter.date,
    };
  } catch (error) {
    console.error("[getWhatsNewSummary] Failed to load blog highlight", error);
    return null;
  }
}

/**
 * Cross-request cached What's New highlight shared by the header and the home hero.
 * Reuses one 10 minute cache entry so those surfaces do not scan blog entries separately.
 */
export const getCachedWhatsNewSummary = unstable_cache(
  getWhatsNewSummary,
  ["whats-new-summary"],
  { revalidate: 600, tags: ["blog", "whats-new"] },
);
