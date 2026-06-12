import {
  getBlogEntries,
  getLatestReleasePost,
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
  const releasePost = await getLatestReleasePost();
  if (releasePost) {
    return {
      slug: releasePost.slug,
      title: releasePost.frontmatter.title,
      date: releasePost.frontmatter.date,
    };
  }

  const entries = await getBlogEntries();
  const latestPost = entries.find((entry) => !entry.frontmatter.draft);
  if (!latestPost) {
    return null;
  }

  return {
    slug: latestPost.slug,
    title: latestPost.frontmatter.title,
    date: latestPost.frontmatter.date,
  };
}
