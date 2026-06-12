import { site } from "~/app/brand";
import { getBlogEntries } from "~/lib/content/blog-loader";

export const dynamic = "force-static";

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
 * Serves a statically generated RSS 2.0 feed for published blog posts.
 */
export async function GET(): Promise<Response> {
  const entries = await getBlogEntries();
  const published = entries.filter((entry) => !entry.frontmatter.draft);
  const channelLink = `${site.url}/blog`;
  const buildDate =
    published.length > 0
      ? rssPubDate(published[0]!.frontmatter.date)
      : new Date().toUTCString();

  const items = published
    .map((entry) => {
      const itemLink = `${site.url}/blog/${entry.slug}`;
      return `<item>
  <title>${escapeXml(entry.frontmatter.title)}</title>
  <link>${itemLink}</link>
  <guid isPermaLink="true">${itemLink}</guid>
  <pubDate>${rssPubDate(entry.frontmatter.date)}</pubDate>
  <description>${escapeXml(entry.frontmatter.description)}</description>
</item>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
<channel>
  <title>X-ray Atlas Blog</title>
  <link>${channelLink}</link>
  <description>Announcements and engineering notes from the X-ray Atlas team.</description>
  <language>en-us</language>
  <lastBuildDate>${buildDate}</lastBuildDate>
${items}
</channel>
</rss>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
    },
  });
}
