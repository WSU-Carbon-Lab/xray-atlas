import { site } from "~/app/brand";
import { buildBlogRssXml } from "~/lib/content/blog-feed";
import { getPublishedBlogEntries } from "~/lib/content/blog-loader";

export const dynamic = "force-static";

/**
 * Serves the global RSS 2.0 feed for all published blog posts.
 */
export async function GET(): Promise<Response> {
  const published = await getPublishedBlogEntries();
  const channelLink = `${site.url}/blog`;

  const xml = buildBlogRssXml({
    title: "X-ray Atlas Blog",
    link: channelLink,
    description:
      "Announcements and engineering notes from the X-ray Atlas team.",
    postLinkPrefix: channelLink,
    entries: published,
  });

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
    },
  });
}
