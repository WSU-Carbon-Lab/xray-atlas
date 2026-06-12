import type { BlogEntry } from "~/lib/content/blog-loader";

/** Inputs for building an RSS 2.0 XML document from blog entries. */
export interface BlogRssFeedOptions {
  title: string;
  link: string;
  description: string;
  /** Absolute prefix for item links, without a trailing slash (for example `https://example.com/blog`). */
  postLinkPrefix: string;
  entries: BlogEntry[];
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function rssPubDate(isoDate: string): string {
  return new Date(`${isoDate}T12:00:00.000Z`).toUTCString();
}

/**
 * Builds a complete RSS 2.0 XML document for the supplied channel metadata and entries.
 *
 * Entries are emitted in caller order; only `title`, `description`, `date`, and slug are serialized.
 */
export function buildBlogRssXml({
  title,
  link,
  description,
  postLinkPrefix,
  entries,
}: BlogRssFeedOptions): string {
  const buildDate =
    entries.length > 0
      ? rssPubDate(entries[0]!.frontmatter.date)
      : new Date().toUTCString();

  const items = entries
    .map((entry) => {
      const itemLink = `${postLinkPrefix.replace(/\/$/u, "")}/${entry.slug}`;
      return `<item>
  <title>${escapeXml(entry.frontmatter.title)}</title>
  <link>${itemLink}</link>
  <guid isPermaLink="true">${itemLink}</guid>
  <pubDate>${rssPubDate(entry.frontmatter.date)}</pubDate>
  <description>${escapeXml(entry.frontmatter.description)}</description>
</item>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
<channel>
  <title>${escapeXml(title)}</title>
  <link>${link}</link>
  <description>${escapeXml(description)}</description>
  <language>en-us</language>
  <lastBuildDate>${buildDate}</lastBuildDate>
${items}
</channel>
</rss>`;
}
