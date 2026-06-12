/**
 * Static registry mapping blog frontmatter author strings to profile metadata.
 *
 * Keys must match `authors` values in `content/blog` MDX frontmatter exactly.
 */

/** Resolved profile for one blog byline author. */
export interface BlogAuthorProfile {
  name: string;
  orcid?: string;
  userId?: string;
  avatarUrl?: string;
}

const BLOG_AUTHOR_REGISTRY: Record<string, BlogAuthorProfile> = {
  "Harlan Heilman": {
    name: "Harlan Heilman",
    orcid: "0000-0002-6371-2123",
    userId: "0000-0002-6371-2123",
  },
};

/**
 * Resolves frontmatter author strings to {@link BlogAuthorProfile} records.
 *
 * Unknown author strings fall back to `{ name: key }` with no profile links.
 */
export function resolveBlogAuthors(authorKeys: string[]): BlogAuthorProfile[] {
  return authorKeys.map((key) => BLOG_AUTHOR_REGISTRY[key] ?? { name: key });
}

/**
 * Returns the public profile href for an author when `userId` or `orcid` is known.
 */
export function blogAuthorProfileHref(
  author: BlogAuthorProfile,
): string | undefined {
  const userId = author.userId ?? author.orcid;
  return userId ? `/users/${userId}` : undefined;
}
